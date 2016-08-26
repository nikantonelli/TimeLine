
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
        height: nantonelliTimeLineApp.TimeLineBarHeight,
        style: {
            font: '9px Helvetica, sans-serif',
            backgroundColor: nantonelliTimeLineApp.HdrColour
        }

    },
    listeners: {
        afterrender: function(arg1, arg2) {
            if (this.tooltip) {
                Ext.create('Rally.ui.tooltip.ToolTip', {
                    target : this.getEl(),
                    html: this.tooltip
                });
            }
        }
    }
});
