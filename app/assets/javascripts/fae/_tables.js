/* global Fae, FCH */

'use strict';

/**
 * Fae tables
 * @namespace tables
 * @memberof Fae
 */
Fae.tables = {

  init: function() {
    this.columnSorting();
    this.rowSorting();
    if(FCH.exists('.sticky-table-header')) {
      this.stickyTableHeader();
    }
    if(FCH.exists('.collapsible')) {
      this.collapsibleTable();
    }
    if(FCH.exists('form .main_content-section-area')) {
      this.endingSelectShim();
    }
    this.addToTable();
  },

  /**
   * Sort columns in tables if applicable
   */
  columnSorting: function() {
    $('.main_table-sort_columns').tablesorter();
    $('.main_table-sort_columns-cities').tablesorter({
      sortList: [[1,0]]
    });
  },

  /**
   * Make table rows draggable by user
   */
  rowSorting: function() {
    $('.main_content-sortable').sortable({
      items: 'tbody tr',
      opacity: 0.8,
      handle: ('.main_content-sortable-handle'),

      //helper funciton to preserve the width of the table row
      helper: function(e, tr) {
        var $originals = tr.children();
        var $helper = tr.clone();
        var $ths = $(tr).closest('table').find('th');

        $helper.children().each(function(index) {
          // Set helper cell sizes to match the original sizes
          $(this).width($originals.eq(index).width());
          //set the THs width so they don't go collapsey
          $ths.eq(index).width($ths.eq(index).width());
        });

        return $helper;
      },

      // on stop, set the THs back to no inline width for repsonsivity
      stop: function(e, ui) {
        $(ui.item).closest('table').find('th').css('width', '');
      },

      update: function() {
        var $this = $(this);
        var serial = $this.sortable('serialize');
        var object = serial.substr(0, serial.indexOf('['));

        $.ajax({
          url: Fae.path+'/sort/'+object,
          type: 'post',
          data: serial,
          dataType: 'script',
          complete: function(request){
            // sort complete messaging can go here
          }
        });
      }
    });
  },

  /**
   * Enable collapsible tables by clicking the h3 preceding a table. Also enables open/close all
   */
  collapsibleTable: function() {
    $('.collapsible-toggle').click(function() {
      var $this = $(this);

      if($this.hasClass('close-all')) {
        $this.text('Open All');
        $('.collapsible').removeClass('active');
      } else {
        $this.text('Close All');
        $('.collapsible').addClass('active');
      }

      $this.toggleClass('close-all');
    });

    $('.collapsible h3').click(function() {
      var $this = $(this);
      var $toggle = $('.collapsible-toggle');
      /** @type {Boolean} */
      var toggleHasCloseAll = $toggle.hasClass('close-all');

      $this.parent().toggleClass('active');

      // Change toggle messaging as appropriate
      // First check if there are open drawers
      if($('.collapsible.active').length > 1) {

        // Change toggle text if it isn't already close all
        if(!toggleHasCloseAll) {
          $toggle.text('Close All');
          $toggle.addClass('close-all');
        }
      } else {

        // Change toggle text if it isn't already open all
        if(toggleHasCloseAll) {
          $toggle.text('Open All');
          $toggle.removeClass('close-all');
        }
      }
    });
  },

  /**
   * Add extra space if the last item in a form is a select menu so the dropdown doesn't run off the screen or section
   */
  endingSelectShim: function() {
    $('form .main_content-section-area:last-of-type').each(function() {
      var $last_item = $(this).find('.input:last-of-type');

      if( $last_item.hasClass('select') ) {
        $(this).addClass('-bottom-shim');
      }
    });
  },

  /**
   * Fix a table header to the top of the view on scroll
   */
  stickyTableHeader: function() {
    var $sticky_tables = $('.sticky-table-header');
    var sticky_table_header_selector = '.sticky-table-header--hidden';
    var $window = $(window);

    // Add sticky psuedo tables after our main table to hold the fixed header
    $sticky_tables.each(function() {
      var $this = $(this);
      var $header = $this.find('thead').clone();
      var new_classes = $this.attr('class').replace('sticky-table-header', sticky_table_header_selector.substr(1));

      var $fixedHeader = $('<table />', {
        class: new_classes
      });

      $fixedHeader.append( $header );
      $this.after($fixedHeader);
    });

    /**
     * FCH callback for scroll - If the table header is in range, show it, otherwise hide it
     * @access private
     */
    var stickyTableHeaderScroll = function() {
      var offset = FCH.$window.scrollTop();

      $('.sticky-table-header--hidden').each(function() {
        var $this = $(this);
        var tableOffset = $this.data('table-offset');
        var tableBottom = $this.data('table-bottom');

        if (offset >= tableOffset && offset <= tableBottom) {
          $this.show();
        } else {
          $this.hide();
        }
      });
    };

    /**
     * FCH callback for resize and load - Get all values squared away again if the viewport gets smaller
     * @access private
     */
    var sizeTableHeader = function() {
      $sticky_tables.each(function() {
        Fae.tables.sizeFixedHeader($(this));
      });
    };

    FCH.load.push(sizeTableHeader);
    FCH.resize.push(sizeTableHeader);
    FCH.scroll.push(stickyTableHeaderScroll);
  },

  /**
   * Cache offset and height values to spare expensive calculations on scroll
   * @param {jQuery} $this
   */
  sizeFixedHeader: function($this) {
    var headerHeight = $('.main_content-header').outerHeight();
    if(FCH.large_down) {
      headerHeight = $('#main_header').outerHeight();
    }

    var tableOffset = $this.offset().top - headerHeight;
    var theadHeight = $this.find('thead').outerHeight();
    var bottomOffset = $this.height() + tableOffset - theadHeight;
    var $fixedHeader = $this.next('.sticky-table-header--hidden');

    // For whatever reason IE9 does not pickup the .sticky plugin
    if(!$('.js-will-be-sticky').length) {
      tableOffset += headerHeight;
      headerHeight = 0;
    }

    $fixedHeader.data({
      'table-offset' : tableOffset,
      'table-bottom' : bottomOffset
    });

    $fixedHeader.css({
      width: $this.outerWidth(),
      height: theadHeight,
      top: headerHeight,
    });

    $this.find('thead tr th').each(function(index){
      var original_width = $(this).outerWidth()
      // Using .width() as a setter is bunk
      $($fixedHeader.find('tr > th')[index]).css('width', original_width);
    });
  },

  /**
   * Scroll_to event for non-ajax'd table forms
   */
  addToTable: function() {
    $('.table-add-link-visible').click('on', function(){
      var $parent = $(this).closest('section');

      FCH.smoothScroll($parent.find('tbody tr:last-child'), 500, 100, 90);
    });
  }
};