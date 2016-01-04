Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    inheritableStatics: {
        ErrorColour: 'tomato',
        WarnColour:  'orangered',
        PassColour:  'lightgreen',
        DoneColour:  'silver',
        ToDoColour:  'salmon',
        HdrColour:   'lightgray',
        DataError:   'red',
        DaysPerMonth: [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        TreeBoxWidth: 150,
        StandardBarHeight: 30
    },

    items: [
        {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    flex: 1,
                    layout: 'hbox',
                    items: [
                        {
                            xtype: 'rallyportfolioitemtypecombobox',
                            margin: 10,
                            id: 'piType'
                        },
                        {
                            xtype: 'rallydatefield',
                            margin: 10,
                            format: 'D d M Y',
                            id: 'StartDate',
                            stateful: true,
                            fieldLabel: 'Start Date',
                            value: Ext.Date.subtract( new Date(), Ext.Date.DAY, 90) // 90 days of previous information
                        },
                        {
                            xtype: 'rallydatefield',
                            margin: 10,
                            fieldLabel: 'End Date',
                            format: 'D d M Y',
                            stateful: true,
                            id: 'EndDate',
                            value: new Date()
                        }
                    ]
                },
                {
                    xtype: 'container',
                    layout: 'hbox',
                    margin: 10,
                    items: [
                        {
                            xtype: 'rallybuttonslider',
                            labelText: 'Zoom',
                            id: 'zoomSlider',
                            stateful: true,
                            value: 10

                        }
                    ]
                }
            ]
        }
    ],

    //Define a pixel factor for the zoom
    zoomLevel: 1,

    _resetTreeBox: function(app) {
        var tb = Ext.getCmp('treeBox');
        app._destroyBars(tb.id);
        tb.add( {
            xtype: 'timeLineBar',
            html: 'Items',
            colour: CustomApp.HdrColour,
            width: '100%',
            margin: '10 0 10 0'
        });

    },

    _destroyBars: function(boxTitle) {

        var box = Ext.getCmp(boxTitle);
        if (box) { box.removeAll(); }
    },

     _resizeAllBars: function() {
        this._destroyBars('monthBox');
        this._drawMonthBars();
        this._destroyBars('lineBox');
        this._redrawTimeLines(this, Ext.getCmp('piType').getRecord().get('TypePath'));
    },

    launch: function() {

        var app = this;

        // Get the zoom slider and  add some handlers
        var slider = Ext.getCmp('zoomSlider');
        var lb = slider.getLeftButton();
        var rb = slider.getRightButton();
        var sl = slider.getSlider();

        rb.on('click', function() {
            app.zoomLevel += 1;
            if (app.zoomLevel > 10) { app.zoomLevel = 10; }
            sl.setValue( app.zoomLevel * 10 );
            app._resizeAllBars();
        });

        lb.on('click', function() {
            app.zoomLevel -= 1;
            if (app.zoomLevel <= 0) { app.zoomLevel = 1; }
            sl.setValue( app.zoomLevel * 10 );
            app._resizeAllBars();
        });

        sl.on('changecomplete', function( slider, value, that) {
            app.zoomLevel = Math.trunc(value/10);
            app._resizeAllBars();
        });

        // Add handlers for date changes

        Ext.getCmp('StartDate').on('select', app._resizeAllBars, app);
        Ext.getCmp('EndDate').on('select', app._resizeAllBars, app);

        //Define a box to the left for the item tree and a box to the right that has the lines in

        var timeLineBox = Ext.create('Ext.container.Container', {
                layout: 'hbox',
                items: [
                    {
                        xtype: 'container',
                        id: 'treeBox',
                        width: this.self.TreeBoxWidth - 4, //Margin
                        autoScroll: false
                    },
                    {
                        xtype: 'container',
                        layout: 'vbox',
                        items: [
                            {
                                xtype: 'container',
                                id: 'monthBox',
                                layout: 'hbox',
                                margin: '10 0 10 0'
                            },
                            {
                                xtype: 'container',
                                autoSize: true,
                                id: 'lineBox'
                            }
                        ],
                        flex: 1,
                        autoScroll: true
                    }
                ],
            listeners: {
                render: this._headerRendered, //Once rendered we have the layout dimensions
                scope: app
            }
        });

        this.add(timeLineBox);

        //Whilst that is happening, fetch the roots (not tree!)

        //TODO

        var pitype = Ext.getCmp('piType').on('select', function() { app._redrawTimeLines(app, this.getRecord().get('TypePath')); });
    },

    onTimeBoxScopeChange: function(newScope) { this._redrawTimeLines(this, Ext.getCmp('piType').getRecord().get('TypePath')); },

    _redrawTimeLines: function(app, type ) {

        var filters = [];
        var timeboxScope = app.getContext().getTimeboxScope();
        if(timeboxScope) {
            filters.push(timeboxScope.getQueryFilter());
        }

        var itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: type,
            autoLoad: true,
            filters: filters,
            listeners: {
                load: function(store, data, success) {
                    var stats = app._calcTimeStats();
                    var timeLineBox = Ext.getCmp('lineBox');
                    var treeBox = Ext.getCmp('treeBox');
                    app._destroyBars(timeLineBox.id);
                    app._resetTreeBox(app);

                    _.each(data, function(item) {
                        //We are creating two bars within the space of one, so reduce the height

                        //Create a container to hold the bars

                        var box = Ext.create('Ext.container.Container', {
                            id: 'timeLineBox-' + item.get('FormattedID')
                        });

                        box.addCls('tlBox');
                        box.height = CustomApp.StandardBarHeight;

                        // Create bar for PlannedStart and PlannedEnd
                        var record = {};
                        record.colour = CustomApp.HdrColour;
                        record.title = '';
                        record.width = 0;
                        record.height = Math.floor(CustomApp.StandardBarHeight/2);
                        record.margin = 0;
//debugger;
                        var start = new Date(item.get('PlannedStartDate'));
                        var end = new Date(item.get('PlannedEndDate'));

                        //Are there incomplete data
                        if (!(item.get('PlannedStartDate') && item.get('PlannedEndDate'))) {
                            record.colour = CustomApp.DataError;
                        }

                        var startBetween = Ext.Date.between( start, stats.start, stats.end);
                        var endBetween = Ext.Date.between( end, stats.start, stats.end);

                        //If there is no start date in the item, the timeline will go back forever!

                        if ( !startBetween && endBetween ){
                            record.leftMargin = 0;
                            record.width = (Ext.Date.getElapsed( stats.start, end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        //If there is no end date in the item, the timeline will go on forever!

                        else if ( startBetween && !endBetween ) {
                            record.leftMargin = (Ext.Date.getElapsed( stats.start, start)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                            record.width = (Ext.Date.getElapsed( start, stats.end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        else if ( startBetween && endBetween) {
                            record.leftMargin = (Ext.Date.getElapsed( stats.start, start)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                            record.width = (Ext.Date.getElapsed( start, end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        var plannedBar = app._createBar(record);
                        plannedBar.addCls('planBar');
                        box.add(plannedBar);

                        // Create bar for ActualStart and ActualEnd
                        record.colour = CustomApp.PassColour;

                        var start = new Date((dstr = item.get('ActualStartDate'))? dstr : Ext.Date.now());
                        var end = new Date((dstr = item.get('ActualEndDate'))? dstr : Ext.Date.now());

                        var startBetween = Ext.Date.between( start, stats.start, stats.end);
                        var endBetween = Ext.Date.between( end, stats.start, stats.end);

                        //If there is no start date in the item, the timeline will go back forever!

                        if ( !startBetween && endBetween ){
                            record.leftMargin = 0;
                            record.width = (Ext.Date.getElapsed( stats.start, end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        //If there is no end date in the item, the timeline will go on forever!

                        else if ( startBetween && !endBetween ) {
                            record.leftMargin = (Ext.Date.getElapsed( stats.start, start)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                            record.width = (Ext.Date.getElapsed( start, stats.end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        else if ( startBetween && endBetween) {
                            record.leftMargin = (Ext.Date.getElapsed( stats.start, start)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                            record.width = (Ext.Date.getElapsed( start, end)/ (24 * 3600 * 1000)) * stats.pixelsPerDay;
                        }

                        var actualBar = app._createBar(record);
                        box.add(actualBar);
                        timeLineBox.add(box);

                        var titleRec = {};
                        titleRec.colour = CustomApp.HdrColour;
                        titleRec.leftMargin = 0;
                        titleRec.width = '100%',
                        titleRec.title = item.get('FormattedID') + ': ' + item.get('Name');
                        var titleBox = app._createBar(titleRec);
                        titleBox.addCls('tltBox');
                        treeBox.add(titleBox);

                    });
                }
            }
        });
    },

//        Ext.util.Observable.capture( pitype, function(event) { console.log( 'pitype:', arguments);});


//gb = Ext.getBody()
//gb.dom.getElementsByClassName('rally-app')

    //Only call in the context of the rally-app to get the dimensions
    _calcTimeStats: function() {
        //We want to show a minimum of 1 pixel per day. We will start off looking at the window size. If that's OK, we draw to
        // fill the box. If we have got below 1 pixel per day, we need to use a wider box and then scroll bars.
        // The zoom level control may increase the minimum in pixel increments or 10%, whichever is the smaller.

        var stats = {};

        // We want to show the whole month that it starts in and ends in
        stats.start =  new Date(Ext.Date.getFirstDateOfMonth(Ext.getCmp('StartDate').value));
        stats.end =  new Date(Ext.Date.getLastDateOfMonth(Ext.getCmp('EndDate').value));

        stats.daysDuration = (stats.end - stats.start)/ (24 * 3600 * 1000);
        stats.daysDuration = (stats.daysDuration > 31) ? stats.daysDuration : 31 ;   //One more than the biggest month to make sure we show correctly
        var pixelsPerDay = (this.getWidth() - this.self.TreeBoxWidth) / (stats.daysDuration > 0 ? stats.daysDuration : 1) * this.zoomLevel;
        stats.pixelsPerDay = pixelsPerDay > 1 ? pixelsPerDay : 1;

        return stats;

    },

    _drawMonthBars: function() {

        var record = {};

        var monthBox = Ext.getCmp('monthBox');
        stats = this._calcTimeStats();

        monthNum = stats.start.getMonth();
        lDate = stats.start;
        lDays = 0;

        while (lDays <= stats.daysDuration) {
            record.title = Ext.Date.format(lDate, 'M Y');
            record.colour = CustomApp.HdrColour;
            record.width = (this.self.DaysPerMonth[monthNum] * stats.pixelsPerDay);

            mnth = this._createBar(record);
            mnth.addCls('mnthBox');
            monthBox.add(mnth);

            lDays += this.self.DaysPerMonth[monthNum];
            lDate = Ext.Date.add(lDate, Ext.Date.DAY, this.self.DaysPerMonth[monthNum]);
            monthNum += 1;
            if (monthNum > 11 ) { monthNum = 0;}
        }
    },

    _createBar: function( record ) {

        margin = '0 0 0 ' + record.leftMargin;

        bar =  Ext.create('Rally.app.CustomTimeLineBar', {
            id: 'TimeLineBar-' + Ext.id(),
            margin: margin,
            html: record.title,
            width: record.width,
            height: record.height || CustomApp.StandardBarHeight,
            align: 'center'
        });
//debugger;
        bar.setStyle({'backgroundColor' : record.colour});

        return bar;
    },

    _headerRendered: function() {

        //Now draw in some month bars
        this._drawMonthBars();
        this._resetTreeBox(this);
    }
});

Ext.define('Rally.app.CustomTimeLineBar', {
    extend: 'Ext.Component',
    alias: 'widget.timeLineBar',

    constructor: function(config) {
        this.mergeConfig(config);       //Style is not merged, just over-written! Use setStyle instead.
        this.callParent(arguments);
    },

    config: {
        autoSize: true,
        viewBox: false,
        draggable: false,
        height: CustomApp.StandardBarHeight,
        style: {
            font: '12px Helvetica, sans-serif',
//            borderColor:'#FFFFFF',
//            borderStyle:'solid',
//            borderWidth:'1px',
            backgroundColor: CustomApp.HdrColour,
            textAlign: 'center',
        }

    },

//    renderTpl: this.getContentTpl(),
//
    getContentTpl: function() {
        var me = this;

        return Ext.create('Ext.XTemplate',
            '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>',
            '{[this.getActionsGear()]}',
            '<div class="textContent ellipses">{[this.getFormattedId()]} {[this.getSeparator()]}{Name}</div>',
            '<div class="rightSide">',
            '</div>',
            {
                canDrag: function() {
                    return me.getCanDrag();
                },
                getActionsGear: function() {
                    return me._buildActionsGearHtml();
                },
                getFormattedId: function() {
                    var record = me.getRecord();
                    return record.getField('FormattedID') ? Rally.ui.renderer.RendererFactory.renderRecordField(record, 'FormattedID') : '';
                },
                getSeparator: function() {
                    return this.getFormattedId() ? '- ' : '';
                }
            }
        );
    }
});

