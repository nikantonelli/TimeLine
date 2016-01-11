
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
        height: CustomApp.TimeLineBarHeight,
        style: {
            font: '12px Helvetica, sans-serif',
            backgroundColor: CustomApp.HdrColour
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
