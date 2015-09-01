var AjaxForms = {

  init: function() {
    this.set_elements();
    this.addedit_links();
    this.addedit_submission();
    this.delete_no_form();
    this.set_filter_dropdowns();
    this.apply_cookies_onload();
    if (this.$filter_form.length) {
      this.filter_select();
      this.filter_submission();
    }
  },

  set_elements: function() {
    this.$addedit_form = $('.js-addedit-form');
    this.$filter_form = $('.js-filter-form');
  },

  addedit_links: function() {
    this.$addedit_form.on('click', '.js-add-link, .js-edit-link', function(ev) {
      ev.preventDefault();
      var $this = $(this);
      var $parent = $this.closest('.js-addedit-form');
      var $wrapper = $parent.find('.js-addedit-form-wrapper');

      // scroll to the last column of the tbody, where the form will start
      Admin.scroll_to($parent.find("tbody tr:last-child"), 90);

      $.get($this.attr('href'), function(data){
        // check to see if the content is hidden and slide it down if it is.
        if ($wrapper.is(":hidden")) {
          // replace the content of the form area and initiate the chosen and fileinputer
          $wrapper.html(data).find(".select select").fae_chosen({ width: '300px' });
          $wrapper.find(".input.file").fileinputer({delete_class: "icon-delete_x file_input-delete"});
          $wrapper.slideDown();
        } else {
          // if it is visible, replace its content by retaining height
          $wrapper.height($wrapper.height());

          // replace the content of the form area and then remove that height and then chosen and then fileinputer
          $wrapper.html(data).css("height", "").find(".select select").fae_chosen();
          $wrapper.find(".input.file").fileinputer({delete_class: "icon-delete_x file_input-delete"});
        }

        Admin.init_date_picker();
        Admin.init_daterange_picker();
        Admin.init_slugger();

        $wrapper.find(".hint").hinter();
      });
    });
  },

  addedit_submission: function() {
    this.$addedit_form.on('ajax:success', function(evt, data, status, xhr){

      $target = $(evt.target);

      // ignore calls not returning html
      if (data !== ' ' && $(data)[0]) {
        var $this = $(this);
        var $parent = $this.parent();
        // we're manipulating the return so let's store in a var and keep 'data' intact
        var html = data;

        // remotipart returns data inside textarea, let's grab it from there
        if ($(html)[0].localName === 'textarea') {
          html = $(data)[0].value;
        }

        if ($(html)[1] && $(html)[1].className === 'main_content-section-area') {
          // we're returning the table, replace everything

          var $form_wrapper = $(this).find('.js-addedit-form-wrapper');

          // if there's a form wrap, slide it up before replacing content
          if ($form_wrapper.length) {
            $form_wrapper.slideUp(function(){
              AjaxForms.addedit_replace_and_reinit($this, $(html)[1].innerHTML, $target);
            });
          } else {
            AjaxForms.addedit_replace_and_reinit($this, $(html)[1].innerHTML, $target);
          }

          if (!$target.hasClass("js-delete-link")) {
            Admin.scroll_to($parent);
          }
        } else if ($(html)[0].className === 'form_content-wrapper') {
          // we're returning the form due to an error, just replace the form
          $this.find('.form_content-wrapper').replaceWith(html);
          $this.find('.select select').fae_chosen();
          $this.find(".input.file").fileinputer({delete_class: "icon-delete_x file_input-delete"});

          Admin.scroll_to($this.find('.js-addedit-form-wrapper'));
        }

        AjaxForms.init();
        Admin.fade_notices();

      } else if ($target.hasClass("js-asset-delete-link")) {
        // handle remove asset links
        $target.parent().fadeOut('fast', function() {
          $(this).next('.asset-inputs').fadeIn('fast');
        });
      }
    });
  },

  addedit_replace_and_reinit: function($this, html, $target) {
    $this.html(html)
      .find(".select select").fae_chosen();

    Admin.sortable();
  },

  filter_submission: function(params) {
    var _this = this;
    _this.$filter_form
      .on('ajax:success', function(evt, data, status, xhr){
        $(this).next('table').replaceWith($(data).find('table').first());
      })
      .on('click', '.js-reset-btn', function(ev) {
        var form = $(this).closest('form')[0];
        form.reset();
        $(form).find('select').val('').trigger('chosen:updated');
        // reset hashies
        window.location.hash = ''
      })
      .on('change', 'select', function() {
        _this.$filter_form.submit();
      });
  },

  apply_cookies_onload: function() {
    var _this = this;
    $(document).ready(function() {
      var set_cookie = $.cookie($('.js-filter-form').data('cookie-key'))
      if ((set_cookie != false) && (set_cookie.length > 2)) {
        console.log('applied cookies onload');
        var cookie = JSON.parse(set_cookie);
        var keys = Object.keys(cookie)
        var hash = '?';

        for(var i = 0; i < keys.length; i++) {
          if(hash !== '?') {
            hash += '&';
          }
          hash += keys[i] + '=' + cookie[keys[i]];
        }

        if( hash !== '?') {
          window.location.hash = hash;
        }
      }
      var callback = function(params){
        var set_cookie = $('.js-filter-form').data('cookie-key');
        if (set_cookie != true) {
          $.cookie(set_cookie, JSON.stringify(params));
          console.log('setting cookie');
        }
        var hash = window.location.hash;
        AjaxForms.set_filter_dropdowns(hash);
        // AjaxForms.filter_cookie_events(params);
      }
      _this.grind = new Grinder(callback);

    });
  },

  // filter_cookie_events: function(params) {
  //   $(window).on('hashchange', function(){
      
  //   });
  // },

  // update hash when selects changed
  filter_select: function(){
    var _this = this;
    $('.js-filter-form .table-filter-group').on('change', function(){
      if ($('.js-filter-form').data('cookie-key') != false) {
        var key = $(this).find('select').attr('id').split('filter_')[1];
        var value = $(this).find('option:selected').val();

        _this.grind.update(key, value, false, true);
      }
    });
  },

  // check for cookie or hash and set dropdowns/ url accordingly
  set_filter_dropdowns: function(hash) {
    var cookie_name = $('.js-filter-form').data('cookie-key')
    if (cookie_name != false) {
      var parsed = JSON.parse($.cookie(cookie_name));
    } else {
      var parsed = this.grind.parse(hash);
    }
    $.each(parsed, function(k, v){
      $('.js-filter-form .table-filter-group').each(function(){
        var key = $(this).find('select').attr('id').split('filter_')[1];
        var value = $(this).find('option:selected').val();
        if (k == key) {
          $(this).find('option').each(function(){
            if ($(this).val() == v) {
              $(this).prop('selected', 'selected');
              $('#filter_' + key).trigger('chosen:updated');
              $('.js-filter-form').submit();
            };
          });
        }
      });
    });
  },

  delete_no_form: function() {
    // on deletes that don't exist in a form like file upload area
    $('.js-asset-delete-link').on('ajax:success', function(){
      var $this = $(this);
      if (!$this.closest('.js-addedit-form-wrapper').length) {
        var $parent = $this.closest('.asset-actions');
        var $inputs = $parent.next('.asset-inputs');
        $parent.fadeOut(function(){
          $inputs.fadeIn();
        });
      }
    });
  }
};