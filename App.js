//This app does not deal with TimeZone differences. If you see odd pixel misalignments, it is probably due to
//you having different people in different timezones doing stuff in the same workspace.
Ext.define('nantonelliTimeLineApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    id: 'MyApp',
    paleColours: [
        '#E4EECF',
        '#E6E6E6',
        '#BDD7EA',
        '#FFEDBF',
        '#6ab17d',
        '#F1C5DD',
        '#C3E9E3'
    ],
    inheritableStatics: {
        ErrorColour: Rally.util.Colors.red_med,
        WarnColour:  Rally.util.Colors.yellow,
        PassColour:  Rally.util.Colors.lime,
        DoneColour:  'silver',
        ToDoColour:  Rally.util.Colors.cyan_very_lt,
        HdrColour:   'lightgray',
        DataError:   'red',
        DaysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        ChildBoxWidth: 300,
        ParentBoxWidth: 200,
        TimeLineBarHeight: 30,
        HeaderBoxHeight: 15,
        TypeFieldName: 'c_Type'
    },
    items: [
        {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    id: 'headerBox',
                    flex: 1,
                    layout: 'hbox',
                    items: [
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
    getSettingsFields: function() {
        var returnVal = [{
                xtype: 'rallycheckboxfield',
                name: 'percentageType',
                fieldLabel: 'Use story points for percentages',
                stateful: true,
                stateId: 'percent-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'rallycheckboxfield',
                name: 'displayIterations',
                fieldLabel: 'Display Iteration Header',
                stateful: true,
                stateId: 'dispIters-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'rallycheckboxfield',
                name: 'displayReleases',
                fieldLabel: 'Display Release Header',
                stateful: true,
                stateId: 'dispRels-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'rallycheckboxfield',
                name: 'updateForRelease',
                fieldLabel: 'Auto update to Release',
                stateful: true,
                stateId: 'dduRels-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'rallycheckboxfield',
                name: 'groupByParent',
                fieldLabel: 'Group Portfolio Items',
                stateful: true,
                stateId: 'groupByPs-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'rallycheckboxfield',
                name: 'enableOutOfDateRange',
                fieldLabel: 'Enable Out of Range Dates',
                stateful: true,
                stateId: 'enablr-' + Ext.id(),
                labelAlign: 'right',
                labelWidth: 200
            },{
                xtype: 'textarea',
                fieldLabel: 'Query',
                name: 'query',
                anchor: '100%',
                cls: 'query-field',
                margin: '0 70 0 0',
                plugins: [{
                        ptype: 'rallyhelpfield',
                        helpId: 194
                    },
                    'rallyfieldvalidationui'
                ],
                validateOnBlur: false,
                validateOnChange: false,
                validator: function(value) {
                    try {
                        if (value) {
                            Rally.data.wsapi.Filter.fromQueryString(value);
                        }
                        return true;
                    } catch (e) {
                        return e.message;
                    }
                }
            }
        ];
        return returnVal;
    },
    //Define a pixel factor for the zoom
    zoomLevel: 1,
    _resetTreeBox: function(app) {
        var tb = Ext.getCmp('treeBox');
        var pb = Ext.getCmp('parentBox');
        app._destroyBars(tb.id);
        tb.add( app._createBar({
                title: 'Calendar Month:',
                colour: nantonelliTimeLineApp.HdrColour,
                width: '100%',
                margin: '0 0 10 0',
                height: nantonelliTimeLineApp.HeaderBoxHeight,
                align: 'right'
            })
        );
        //If we have a parent box defined, clean that out and reset
        if (pb) {
            app._destroyBars(pb.id);
            pb.add( app._createBar({
                    colour: nantonelliTimeLineApp.HdrColour,
                    width: '100%',
                    margin: '0 0 10 0',
                    height: nantonelliTimeLineApp.HeaderBoxHeight,
                    align: 'right'
                })
            );
        }
    },
    _destroyBars: function(boxTitle) {
        var box = Ext.getCmp(boxTitle);
        if (box) { box.removeAll(); }
    },
     _resizeAllBars: function() {
        this._redrawTimeLines(this, Ext.getCmp('piType').getRecord().get('TypePath'));
    },
    _addTipInfo: function(box, tooltipfields) {
        var record = box.record;
        var html = '';
        _.each(tooltipfields, function(tip) {
            var typeOfField = Object.prototype.toString.call(record.get(tip.field));
            //Reformat dates to a short format
            if ( typeOfField.search('Date')){
                html += '<div><strong>' + tip.text + ': </strong>' + Ext.Date.format(record.get(tip.field), 'D d M Y (T)') + '</div>';
            } else {
                html += '<div><strong>' + tip.text + ': </strong>' + record.get(tip.field) + '</div>';
            }
        });
        return ((html.length>0)? html: null);
    },
    _renderTimeboxes: function() {
        this._iterationRender(); //Do it in this order because of the container arrangement
        this._releaseRender();
    },
    _iterationRender: function() {
        if (!(this.getSetting('displayIterations')))
            return;
        var title = 'Sprint: ';
        var tb = Ext.getCmp('treeBox');
        var titleBox = this._createBar(
        {
            width: '100%',
            height: nantonelliTimeLineApp.HeaderBoxHeight,
            title: title,
            colour : nantonelliTimeLineApp.HdrColour,
            align: 'right'
        });
        tb.insert(0, titleBox);
        var pb = Ext.getCmp('parentBox');
        if (pb) {
            var blankBox = this._createBar(
            {
                width: '100%',
                height: nantonelliTimeLineApp.HeaderBoxHeight,
                title: '',
                colour : nantonelliTimeLineApp.HdrColour,
                align: 'right'
            });
            pb.insert(0, blankBox);
        }
        var tipFields = [
            {
                'text' : 'Iteration Start Date',
                'field': 'StartDate'
            },
            {
                'text' : 'Iteration End Date',
                'field': 'EndDate'
            }
        ];
        this._timeboxRender('iteration', 'StartDate', 'EndDate', title, tipFields);
    },
    _releaseRender: function() {
        if (!(this.getSetting('displayReleases'))) 
            return;
        var title = 'Program Increment: ';
        var tb = Ext.getCmp('treeBox');
        var titleBox = this._createBar(
        {
            width: '100%',
            height: nantonelliTimeLineApp.HeaderBoxHeight,
            title: title,
            colour : nantonelliTimeLineApp.HdrColour,
            align: 'right'
        });
        tb.insert(0, titleBox);
        var pb = Ext.getCmp('parentBox');
        if (pb) {
            var blankBox = this._createBar(
            {
                width: '100%',
                height: nantonelliTimeLineApp.HeaderBoxHeight,
                title: '',
                colour : nantonelliTimeLineApp.HdrColour,
                align: 'right'
            });
            pb.insert(0, blankBox);
        }
        var tipFields = [
            {
                'text' : 'Release Start Date',
                'field': 'ReleaseStartDate'
            },
            {
                'text' : 'Release End Date',
                'field': 'ReleaseDate'
            }
        ];
        this._timeboxRender('release', 'ReleaseStartDate', 'ReleaseDate', title, tipFields);
    },
    _timeboxRender: function(model, startdatefield, enddatefield, title, tooltipfields) {
        var app = this;
        var dataStore = Ext.create('Rally.data.wsapi.Store', {
            model: model,
            autoLoad: true,
            context: {
                project: Rally.environment.getContext().getProjectRef(),
                projectScopeUp: false,
                projectScopeDown: false
            },
            sorters: [{
                property: enddatefield,
                direction: 'ASC'
            }],
            listeners: {
                load: function(store, data, success) {
                    //Create a list of items removing gaps between timboxes (shouldn't be any apart from the day of handover)
                    var timeBox = Ext.getCmp(model + 'Box');
                    var boxes = [];
                    //If the first release starts after the time period, we need a blank at the start...
                    var srd = data[0].get(startdatefield);
                    if ( srd > stats.start){
                        var startBox = {
                            'width': (Ext.Date.getElapsed( srd, stats.start)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'start': stats.start,
                            'leftMargin': 0,
                            'end': srd,
                            'colour': nantonelliTimeLineApp.ToDoColour,
                            'height': nantonelliTimeLineApp.HeaderBoxHeight
                        };
                        boxes.push(startBox);
                    }
                    _.each(data, function(tb) {
                        var thisStart = Ext.Date.clearTime(tb.get(startdatefield));
                        var thisEnd = Ext.Date.clearTime(Ext.Date.add(tb.get(enddatefield), Ext.Date.HOUR, 1)); //Takes you up to the end of the day
                        if ((lastBox = boxes[boxes.length-1])) {
                            //Check the date of the last one and if needed, add a spacer
                            if (lastBox.end != thisStart) {
                                var spacerBox = {
                                    'width': (Ext.Date.getElapsed( lastBox.end, thisStart)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                                    'start': lastBox.end,
                                    'leftMargin': 0,
                                    'end': thisStart,
                                    'colour': nantonelliTimeLineApp.ToDoColour,
                                    'height': nantonelliTimeLineApp.HeaderBoxHeight
                                };
                                boxes.push(spacerBox);
                            }
                        }
                        var box = {
                            'width': (Ext.Date.getElapsed( thisEnd, thisStart)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'leftMargin': 0,
                            'start': thisStart,
                            'end': thisEnd,
                            'colour': nantonelliTimeLineApp.HdrColour,
                            'title': tb.get('Name'),
                            'height': nantonelliTimeLineApp.HeaderBoxHeight,
                            'record': tb
                        };
                        box.tooltip = app._addTipInfo(box, tooltipfields);
                        boxes.push(box);
                    });
                    //If the last release end before the time period, we need a blank at the end...
                    var erd = boxes[boxes.length-1].end;
                    if ( erd < stats.end){
                        var endBox = {
                            'width': (Ext.Date.getElapsed( erd, stats.end)* stats.pixelsPerDay)/(24 * 3600 * 1000),
                            'start': erd,
                            'leftMargin': 0,
                            'end': stats.end,
                            'colour': nantonelliTimeLineApp.ToDoColour,
                            'height': nantonelliTimeLineApp.HeaderBoxHeight
                        };
                        boxes.push(endBox);
                    }
                    //Now truncate the list of boxes depending on the display time
                    _.each(boxes, function(box) {
                        if (!((box.end < stats.start) || (box.start > stats.end))) {    //Somewhere in view
                            if (box.start < stats.start) {
                                box.start = stats.start;
                                if (box.start >= box.end) {
                                    box.width = 0;
                                } else {
                                    box.width = (Ext.Date.getElapsed( box.end, box.start)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                                }
                            }
                            if (box.end > stats.end) {
                                box.end = stats.end;
                                if ( box.end <= box.start) {
                                    box.width = 0;
                                } else {
                                    box.width = (Ext.Date.getElapsed( box.end, box.start)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                                }
                            }
                            var theBar = app._createBar(box);
                            theBar.addCls('mnthBox');
                            theBar.addCls('tltBox');
                            timeBox.add(theBar);
                        }
                    });
                }
            }
        });
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
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        });
        lb.on('click', function() {
            app.zoomLevel -= 1;
            if (app.zoomLevel <= 0) { app.zoomLevel = 1; }
            sl.setValue( app.zoomLevel * 10 );
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        });
        sl.on('changecomplete', function( slider, value, that) {
            app.zoomLevel = Math.trunc(value/10);
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        });
        // Add handlers for date changes
        Ext.getCmp('StartDate').on('select', app._resizeAllBars, app);
        Ext.getCmp('EndDate').on('select', app._resizeAllBars, app);
        //Define a box to the left for the item tree and a box to the right that has the lines in
        var hboxItems = [{
                        xtype: 'container',
                        id: 'treeBox',
                        width: this.self.ChildBoxWidth - 4, //Margin
                        margin: '0 0 0 0', //Space for milestone box, if needed
                    },
                    {
                        xtype: 'container',
                        id: 'scrollBox',
                        layout: 'vbox',
                        items: [
                            {
                                xtype: 'container',
                                id: 'releaseBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                id: 'iterationBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                id: 'monthBox',
                                layout: 'hbox'
                            },
                            {
                                xtype: 'container',
                                autoSize: true,
                                id: 'lineBox'
                            }
                        ],
                        flex: 1,
                        style: {
                            overflowX: 'scroll',
                            overflowY: 'visible'
                        }
                    }
                ];
        if ( app.getSetting('groupByParent')){
            hboxItems.splice(0,0, {
                        xtype: 'container',
                        id: 'parentBox',
                        width: this.self.ParentBoxWidth - 4, //Margin
                        margin: '0 0 0 0', //Space for milestone box, if needed
                    });
        }
        var timeLineBox = Ext.create('Ext.container.Container', {
                layout: 'hbox',
                items: hboxItems
        });
        this.add(timeLineBox);
        /** Add the milestone field value chooser  
         * 
         */

        Rally.data.ModelFactory.getModel({
            type: 'Milestone',
            context: app.getContext().getDataContext(),
            success: function(model) {
                if  ( model.hasField(nantonelliTimeLineApp.TypeFieldName)) {
                    var field = model.getField(nantonelliTimeLineApp.TypeFieldName);
                    if (( field.attributeDefinition.AttributeType === "COLLECTION") &&
                            (field.attributeDefinition.Constrained === true) &&
                            (field.hidden === false)) {
                        model.getField(nantonelliTimeLineApp.TypeFieldName).getAllowedValueStore({
                            filters: [{
                                property: 'StringValue',
                                operator: "!=",
                                value: null
                            }]
                        }).load().then({
                            success: function(records) {
                                app.down('#headerBox').add({
                                    fieldLabel: 'Show Milestone Type',
                                    id: 'milestoneTypes',
                                    labelWidth: 150,
                                    xtype: 'rallycombobox',
                                    margin: 10,
                                    multiSelect: true,
                                    displayField: 'StringValue',
                                    valueField: 'StringValue',
                                    allowBlank: true,
                                    allowClear: false,
                                    store: records[0].stores[0],
                                    listeners: {
                                        change: function(combobox, selected) {
                                            app._addLines();
                                        },
                                        scope: app
                                    }
                                });
                            },
                            failure: function(e) {
                                console.log('Could not get Type field data on Milestones', e);
                            }
                        });
                    }
                }
            }
        });
        
        //Whilst that is happening, fetch the roots (not tree!)
        //TODO
        var pitype = Ext.getCmp('piType');
        if ( !(pitype)){
            pitype = Ext.create('Rally.ui.combobox.PortfolioItemTypeComboBox',
                        {
                            margin: 10,
                            id: 'piType',
                            listeners: {
                                select: function() { app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath')); }
                            }
                        });
        }
        Ext.getCmp('headerBox').insert(0, pitype);
    },

    onTimeboxScopeChange: function(newScope) {
        this.callParent(arguments);
        var app = this;
        //We only have releases on portfolio items
        if (newScope.type != 'release')
            return;
        var release = newScope.getRecord();
        //If we set the override to 'always' then skip this
        if (!(this.getSetting('updateForRelease'))){
            //Give the user the option to change the start/edn dates to match
            Ext.create('Rally.ui.dialog.ConfirmDialog', {
                message: 'Update view dates to match Release?',
                title: 'Timebox Scope Change Request',
                confirmLabel: 'Ok',
                listeners: {
                    confirm: function(){
                        Ext.getCmp('StartDate').setValue(release.get('ReleaseStartDate'));
                        Ext.getCmp('EndDate').setValue(release.get('ReleaseDate'));
                        app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
                    },
                    cancel: function(){
                        app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
                    }
                }
            });
        } else {
            Ext.getCmp('StartDate').setValue(release.get('ReleaseStartDate'));
            Ext.getCmp('EndDate').setValue(release.get('ReleaseDate'));
            app._redrawTimeLines(app, Ext.getCmp('piType').getRecord().get('TypePath'));
        }
    },
    // Modify the title box popup if the data is invalid
    _dataCheckItem: function(app, box, item) {
        var fail = false;
        var html = '';
        if (item.self.isPortfolioItem()) {
            //Check for planned dates
            if  (!(item.get('PlannedStartDate'))) {
                fail = true;
                html += '<div><strong> Missing Planned Start Date</strong></div>';
            }
            if (!(item.get('PlannedEndDate'))) {
                fail = true;
                html += '<div><strong> Missing Planned End Date</strong></div>';
            }
        }
        if (fail) {
            box.addCls('errorCorner');
            box.tooltip = html;
        }
    },

    _milestoneColours: ['green', 'blue', 'brown', 'purple', 'olive', 'fuchsia', 'lime', 'maroon'],

    _fetchMilestones: function() {
        var deferred = Ext.create('Deft.Deferred');

        if ( this._milestoneStore ) {
            deferred.resolve(this._milestoneStore.getRecords());
            return deferred.promise;
        }

        var filters = Rally.data.wsapi.Filter.or([
            {
                property: 'Projects.ObjectID',
                value: this.getContext().getProject().ObjectID
            },
            {
                property: 'Projects.ObjectID',
                value: null
            }
        ]);

        var me = this;
        Ext.create('Rally.data.wsapi.Store',{
            model: 'Milestone',
            autoLoad: false,
            fetch: true,
            filters: filters,
            listeners: {
                load: function(store, results, success) {
                    if (success) {
                        if (store.getRecords().length && success) {
                            me._milestoneStore = store;
                            deferred.resolve(results);
                        }
                        else {
                            deferred.resolve(null);
                        }
                    }
                    else {
                        console.log('Oh de bugger!');
                    }
                }
            }
        }).load();
        return deferred.promise;

    },

    _applyMilestoneFilter: function() {
        var me = this;
        /** ~Get the current setting of the milestone types and
         * apply that to the milestones given
        */
        if (Ext.getCmp('milestoneTypes')) {
            var mst = Ext.getCmp('milestoneTypes').value;    //An array of indexes
            return _.filter(me._milestoneStore.getRecords(), function(record) {
                return _.find(record.get(me.self.TypeFieldName)._tagsNameArray, function (tag) {
                    return _.find(mst, function(type) { 
                        return tag.Name === type;
                    });
                });
            });
        }
        return [];
    },

    _addMilestones: function() {
        var me = this;
        this._fetchMilestones().then({
            success: function() {
                me._undrawMilestones();
                me._drawMilestones(me._applyMilestoneFilter());
            },
            scope: me
        });
    },

    _undrawMilestones: function() {

        var msbox = Ext.getCmp('milestoneBox');
        msbox.removeAll();
        this._addLine('Today', new Date(), 'today');
    },

    _drawMilestones: function(milestones) {
        var me = this;
        _.each(milestones, function(milestone) {
            var typeCls = milestone.get('Projects').Count?'projectMls':'globalMls';
            var mls = me._addLine(milestone.get('Name'), milestone.get('TargetDate'), typeCls);
            mls.getEl().setStyle( { borderColor: (milestone.get('DisplayColor').length?milestone.get('DisplayColor'): '#000000')});
        });
    },

    _addLine: function(title, date, typeCls) {
        var msbox = Ext.getCmp('milestoneBox');
        
        //Create a thing to add to lineBox
        thisLine = Ext.create('Ext.container.Container', {
            height: Ext.getCmp('lineBox').getHeight(),
            width: '2px',
            cls: 'overlayLine',
            margin: '0 0 0 ' + (Ext.Date.getElapsed( stats.start, date) * stats.pixelsPerDay)/(24 * 3600 * 1000)
        });
        thisLine.addCls(typeCls+'Line');
//        thisLine.render(msbox.getEl());
        msbox.add(thisLine);
        thisIcon = Ext.create('Ext.container.Container', {
            height: '10px',
            width: '10px',
            cls: 'overlayLine',
            margin: '0 0 0 ' + (((Ext.Date.getElapsed( stats.start, date) * stats.pixelsPerDay)/(24 * 3600 * 1000)) - 4),

            listeners: {
                afterrender: function() {
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target : this.getEl(),
                        html: title + ': ' + Ext.Date.format(date, 'D, d M Y')
                    });
                }
            }
        });
        thisIcon.addCls(typeCls+'Icon');
//        thisIcon.render(msbox.getEl());
        msbox.add(thisIcon);
        return thisLine;
    },

    _redrawTimeLines: function(app, type ) {
        var filters = [];
        var timeboxScope = app.getContext().getTimeboxScope();
        if(timeboxScope) {
            filters.push(timeboxScope.getQueryFilter());
        }
        //Now get the settings query box and apply those settings
        var queryString = app.getSetting('query');
        if (queryString) {
            var filterObj = Rally.data.wsapi.Filter.fromQueryString(queryString);
            filterObj.itemId = filterObj.toString();
            filters.push(filterObj);
        }
        var sorter = null;
        if ( app.getSetting('groupByParent')) {
            sorter = {
                property: 'Parent',
                direction: 'ASC'
            };
        } else {
            sorter = {
                property: 'rank',
                direction: 'ASC'
            };
        }
        var visibleFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Archived',
            operator: '=',
            value: false
        });
        filters.push(visibleFilter);
        var itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: type,
            autoLoad: true,
            filters: filters,
            sorters: [sorter],
            listeners: {
                load: function(store, data, success) {
                    if ( store.getRecords().length === 0) {
                        Rally.ui.notify.Notifier.showWarning({message: 'No items of selected type found'});
                    }
                    app._destroyBars('lineBox');
                    app._destroyBars('releaseBox');
                    app._destroyBars('iterationBox');
                    app._destroyBars('monthBox');
                    app._destroyBars('monthBox');
                    app._resetTreeBox(app);
                    app._calcTimeStats();
                    app._drawMonthBars();
                    app._renderTimeboxes();
                    app._addMilestoneBox(app);
                    var timeLineBox = Ext.getCmp('lineBox');
                    var treeBox = Ext.getCmp('treeBox');
                    //Layouts times seem to get exponentially bigger on many items, so suspend layouts while adding
                    timeLineBox.suspendLayout = true;
                    treeBox.suspendLayout = true;
                    _.each(data, function(item) {
                        //Apply date filters for outside the date range
                        var startPD = item.get('PlannedStartDate');
                        var endPD = item.get('PlannedEndDate');
                        var startAD = item.get('ActualStartDate');
                        var endAD = item.get('ActualEndDate');
                        var gotSDate =
                                ( startPD ?
                                        (startAD ?
                                            ( startPD < startAD) ?
                                                startAD
                                            : startPD
                                        : startPD)
                                : ( startAD ?
                                        startAD
                                    : null ) );
                        var gotEDate =
                                ( endPD ?
                                    (endAD ?
                                        ( endPD < endAD) ?
                                            endAD
                                        : endPD
                                    : endPD)
                                : ( endAD ?
                                        endAD
                                    : null ) ) ;
                        if ((!app.getSetting('disableOutOfDateRange')) || (gotSDate && gotEDate )) {
                            tlbox = app._createTimeLineForItem(app, item);
                            timeLineBox.add(tlbox);
                            ttbox = app._createTitleBoxForItem(app, item);
                            app._dataCheckItem(app, ttbox, item);
                            treeBox.add(ttbox);
                        }
                    });
                    var pb = Ext.getCmp('parentBox');
                    if (pb) {
                        var uniqs = _.uniq(_.map(data, function(record) { return record.get('Parent') ? record.get('Parent')._refObjectName : "Unknown";}));
                        _.each (uniqs, function(parent) {
                                var found = _.filter(data, function(record) {
                                        return (record.get('Parent') ? record.get('Parent')._refObjectName : "Unknown") === parent;
                                });
                                var parentBox = {};
                                parentBox.height = nantonelliTimeLineApp.TimeLineBarHeight * found.length;
                                parentBox.colour = app.paleColours[_.indexOf(uniqs,parent) % app.paleColours.length];
                                parentBox.title = parent;
                                pb.add(app._createBar(parentBox));
                        });
                    }
                    timeLineBox.suspendLayout = false;
                    treeBox.suspendLayout = false;
                    timeLineBox.updateLayout();
                    treeBox.updateLayout();
                    app._addLines();
                },
                scope: app
            }
        });
    },

    _addLines: function() {
        this._addLine('Today', new Date(), 'today');
        this._addMilestones();
    },

    _createTitleBoxForItem: function(app, item) {
        var titleRec = {};
        titleRec.colour = nantonelliTimeLineApp.HdrColour;
        titleRec.leftMargin = 0;
        titleRec.width = '100%';
        titleRec.title = item.get('FormattedID') + ': ' + item.get('Name');
        var box = app._createBar(titleRec);
        box.addCls('tltBox');
        return box;
    },
    _createTimeLineForItem: function(app, item) {
        var today = new Date(); // Seize the day...
        //We are creating two bars within the space of one, so reduce the height
        //Create a container to hold the bars first
        var box = Ext.create('Ext.container.Container', {
            id: 'timeLineBox-' + item.get('FormattedID')
        });
        box.addCls('tlBox');
        box.height = nantonelliTimeLineApp.TimeLineBarHeight;
        // Create bar for PlannedStart and PlannedEnd. TODO: store these records for later manipulation
        var pRecord = {};
        pRecord.colour = nantonelliTimeLineApp.HdrColour;
        pRecord.width = 0;
        pRecord.height = Math.floor(nantonelliTimeLineApp.TimeLineBarHeight/2);
        pRecord.leftMargin = 0;
        var plannedStart = null;
        var plannedEnd = null;
        var startBetween = null;
        var endBetween = null;
        //Are there incomplete data
        if (!(item.get('PlannedStartDate') && item.get('PlannedEndDate'))) {
            pRecord.colour = nantonelliTimeLineApp.DataError;
        } else {
            plannedStart = new Date(item.get('PlannedStartDate'));
            plannedEnd = new Date(item.get('PlannedEndDate'));
            startBetween = Ext.Date.between( plannedStart, stats.start, stats.end);
            endBetween = Ext.Date.between( plannedEnd, stats.start, stats.end);
            //If there is no start date in the item, the timeline will go back forever!
            if ( !startBetween && endBetween ){
                pRecord.leftMargin = 0;
                pRecord.width = (Ext.Date.getElapsed( stats.start, plannedEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
            //If there is no end date in the item, the timeline will go on forever!
            else if ( startBetween && !endBetween ) {
                pRecord.leftMargin = (Ext.Date.getElapsed( stats.start, plannedStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                pRecord.width = (Ext.Date.getElapsed( plannedStart, stats.end)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
            else if ( startBetween && endBetween) {
                pRecord.leftMargin = (Ext.Date.getElapsed( stats.start, plannedStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                pRecord.width = (Ext.Date.getElapsed( plannedStart, plannedEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
        }
        var plannedBar = app._createBar(pRecord);
        plannedBar.addCls('planBar');
        var tipFields = [
            {
                'text' : 'Planned Start Date',
                'field': 'PlannedStartDate'
            },
            {
                'text' : 'Planned End Date',
                'field': 'PlannedEndDate'
            }
        ];
        plannedBar.record = item;
        plannedBar.tooltip = app._addTipInfo(plannedBar, tipFields);
        box.add(plannedBar);
        // Create bar for ActualStart and ActualEnd
        var aRecord = {};
        var percentComplete = 0;
        if ( app.getSetting('percentageType')) {
            percentComplete = Math.floor(item.get('PercentDoneByStoryPlanEstimate') * 100);
        } else {
            percentComplete = Math.floor(item.get('PercentDoneByStoryCount') * 100);
        }
        aRecord.colour = nantonelliTimeLineApp.PassColour;
        aRecord.height = Math.floor(nantonelliTimeLineApp.TimeLineBarHeight/2);
        aRecord.leftMargin = 0;
        aRecord.width = 0;
        var actualStart = new Date(item.get('ActualStartDate'));
        var actualEnd = new Date(item.get('ActualEndDate'));
        //Let's see what colour it should be
        if ((item.get('ActualStartDate') && item.get('ActualEndDate'))) {
            aRecord.colour = nantonelliTimeLineApp.DoneColour;
            aRecord.title = percentComplete + '%';
            aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            aRecord.width = (Ext.Date.getElapsed( actualStart, actualEnd)* stats.pixelsPerDay)/(24 * 3600 * 1000);
        } else {
            if (item.get('ActualStartDate')) {
                aRecord.title = percentComplete + '%';
                colourStart = item.get('ActualStartDate');
            } else if (item.get('PlannedEndDate')) {
                colourStart = item.get('PlannedStartDate');
            } else {
                colourStart = today;
            }
            if (item.get('ActualEndDate')){
                colourEnd = item.get('ActualEndDate');
            }
            else if (item.get('PlannedEndDate')) {
                colourEnd = item.get('PlannedEndDate');
            }
            else {
                colourEnd = today;
            }
            var totalElapsed = colourEnd - colourStart;
            //User params??
            var acceptanceDelay = totalElapsed * 0.2;
            var warningDelay    = totalElapsed * 0.2;
            colourStartDate = new Date(colourStart);
            colourEndDate = new Date(colourEnd);
            yellowXStart = Ext.Date.add(colourStartDate, Ext.Date.MILLI, acceptanceDelay);
            redXStart = Ext.Date.add(colourStartDate, Ext.Date.MILLI, acceptanceDelay + warningDelay);
            yellowSlope = 100 / (colourEnd - yellowXStart);
            redSlope = 100 / (colourEnd - redXStart);
            redThreshold =redSlope * (today - redXStart);
            yellowThreshold =yellowSlope * (today - yellowXStart);
            if (percentComplete < redThreshold ) {
                aRecord.colour = nantonelliTimeLineApp.ErrorColour;
            }
            if (percentComplete < yellowThreshold ) {
                aRecord.colour = nantonelliTimeLineApp.WarnColour;
            }
            if (today > colourEnd) {
                if (percentComplete >= 100) {
                    aRecord.colour = nantonelliTimeLineApp.DoneColour;
                }
                else {
                    aRecord.colour = nantonelliTimeLineApp.ErrorColour;
                }
            }
            //Now calculate the sizes and position
            startBetween = Ext.Date.between( actualStart, stats.start, stats.end);
            endBetween = Ext.Date.between( actualEnd, stats.start, stats.end);
           //If there is no start date in the item, the timeline will go back forever!
            if ( !startBetween && endBetween ){
                aRecord.leftMargin = 0;
                aRecord.width = (Ext.Date.getElapsed( stats.start, actualEnd?actualEnd:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
            //If there is no end date in the item, the timeline will go on forever!
            else if ( startBetween && !endBetween ) {
                aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                aRecord.width = (Ext.Date.getElapsed( actualStart, item.get('ActualEndDate')?stats.end:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
            else if ( startBetween && endBetween) {
                aRecord.leftMargin = (Ext.Date.getElapsed( stats.start, actualStart)* stats.pixelsPerDay)/(24 * 3600 * 1000);
                aRecord.width = (Ext.Date.getElapsed( actualStart, item.get('ActualEndDate')?actualEnd:today)* stats.pixelsPerDay)/(24 * 3600 * 1000);
            }
        }
        var actualBar = app._createBar(aRecord);
        actualBar.addCls('actualBar');
        actualBar.record = item;
        var actualsFields = [
            {
                'text' : 'Actual Start Date',
                'field': 'ActualStartDate'
            },
            {
                'text' : 'Actual End Date',
                'field': 'ActualEndDate'
            }
        ];
        actualBar.record = item;
        actualBar.tooltip = app._addTipInfo(actualBar, actualsFields);
        box.add(actualBar);
        return box;
    },
//        Ext.util.Observable.capture( pitype, function(event) { console.log( 'pitype:', arguments);});
    //Only call in the context of the rally-app to get the dimensions
    _calcTimeStats: function() {
        //We want to show a minimum of 1 pixel per day. We will start off looking at the window size. If that's OK, we draw to
        // fill the box. If we have got below 1 pixel per day, we need to use a wider box and then scroll bars.
        // The zoom level control may increase the minimum in pixel increments or 10%, whichever is the smaller.
        stats = {};
        // We want to show the whole month that it starts in and ends in
        stats.start =  new Date(Ext.Date.getFirstDateOfMonth(Ext.getCmp('StartDate').value));
        stats.end =  new Date(Ext.Date.getLastDateOfMonth(Ext.getCmp('EndDate').value));
        stats.daysDuration = (stats.end - stats.start)/ (24 * 3600 * 1000);
        stats.daysDuration = (stats.daysDuration > 31) ? stats.daysDuration : 31 ;
        //If we have the parent box visible
        var itemsWidth = this.self.ChildBoxWidth;
        if ( this.getSetting('groupByParent')) {
            itemsWidth = (this.self.ChildBoxWidth + this.self.ParentBoxWidth);
        }
        var pixelsPerDay = (Ext.getBody().getWidth() - itemsWidth) / (stats.daysDuration > 0 ? stats.daysDuration : 1) * this.zoomLevel;
        stats.pixelsPerDay = pixelsPerDay > 1 ? pixelsPerDay : 1;
        return stats;
    },
    _addMilestoneBox: function(app) {
        //We need to force a long box all across the lines box to house the milestone icons
        var lineBox = Ext.getCmp('lineBox');
        var milestoneBox = Ext.create('Ext.container.Container', {
            width: stats.daysDuration * stats.pixelsPerDay,
            height: '10px',
            id: 'milestoneBox',
            cls: 'milestoneboxcls'
        });
        milestoneBox.addCls('mlbox');
        lineBox.add(milestoneBox);
    },
    _drawMonthBars: function() {
        var record = {};
        var monthBox = Ext.getCmp('monthBox');
        monthNum = stats.start.getMonth();
        var lDate = stats.start;
        var lDays = 0;
        while (lDate <= stats.end) {
            record.title = Ext.Date.format(lDate, 'M Y');
            record.colour = nantonelliTimeLineApp.HdrColour;
            record.width = (this.self.DaysPerMonth[monthNum] * stats.pixelsPerDay);
            record.height = nantonelliTimeLineApp.HeaderBoxHeight;
            var mnth = this._createBar(record);
            mnth.addCls('mnthBox');
            monthBox.add(mnth);
            lDate = Ext.Date.add(lDate, Ext.Date.MONTH, 1);
            monthNum += 1;
            if (monthNum > 11 ) { monthNum = 0;}
        }
    },
    _createBar: function( record ) {
        var margin = '0 0 0 ' + (record.leftMargin || 0);
        margin = record.margin || margin;// If we override the margin, use that.
        var bar =  Ext.create('Rally.app.CustomTimeLineBar', {
            id: 'TimeLineBar-' + Ext.id(),
            margin: margin,
            html: record.title || '',
            width: record.width,
            height: record.height || nantonelliTimeLineApp.TimeLineBarHeight
        });
        bar.setStyle({ 'backgroundColor' : record.colour, 'textAlign' : record.align || 'center'});
        bar.tooltip = record.tooltip;
//        bar.record = record.record;
        return bar;
    }
});
