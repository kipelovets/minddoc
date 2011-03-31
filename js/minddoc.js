function MindNode(parentNode) 
{
    this._template = $('#template-container div:first');
    this._element = null;
    this._id = null;

    this.init = function (parentNode) 
    {
        if (parentNode instanceof MindNode) {
            this._element = parentNode.getElement().cloneNode(true);
        }
        // TODO: deep clone
        this._element = this._template[0].cloneNode(true);
        this._id = MindNode.getUniqueId();
        this.getElement().id = this._id;

        MindNode.add(this);

        if (parentNode) {
            $(parentNode).append(this.getElement());
        } else {
            $('#minddoc').append(this.getElement());
        }

        $(this.getElement())
            .sortable({
                delay: 200, 
                cursor: 'move', 
                axis: 'y',
                items: '> div.container',
            });

        $('.head:first', this.getElement()).keydown(function(e){
            if (e.which == 13) {
                if (!e.ctrlKey) {
                    $(this).parent().find('.body:first').show().focus();
                }
                return false;
            }
        });

        (function(node){
            var x = node;

            $('> .cell > .node > .editable', node.getElement())
                .keydown(function(e){
                    if (e.which == 13 && e.ctrlKey) {
                        x.addSibling();                                    
                        e.stopPropagation();
                    } else if (e.which == 27) {
                        x.stopEditing();
                    }
                })
                .focus(function(e){
                    x.activate(true);
                    e.stopPropagation();
                })
                .click(function(e){
                    x.startEditing(e);
                    x.activate();
                    e.stopPropagation();
                });

            $('> .cell > .collapse-button', node.getElement())
                .click(function(e){
                    x.toggle();
                });

            $('> .cell > .remove-button', node.getElement())
                .click(function(e){
                    x.remove();
                });

            $('> .cell > .left-button', node.getElement())
                .click(function(e){
                    x.moveHigher();
                });

            $('> .cell > .right-button', node.getElement())
                .click(function(e){
                    x.moveDeeper();
                });


        })(this);

        this.activate();
        this.startEditing();
    }

    this.getElement = function () {
        return this._element;
    }
    
    this.activate = function (isFocusEvent) {
        if (MindNode.current() === this) {
            return;
        }
        MindNode.current().deactivate();

        $('.node:first', this.getElement()).addClass('active');
        MindNode.prototype._current = this;
    }

    this.deactivate = function () {
        $(this.getElement()).find('.node').removeClass('active');
        MindNode.prototype._current = null;
        this.stopEditing();
    }

    this.getChildNodes = function () {
        return this._childNodes;
    }

    this.stopEditing = function () {
        $('#minddoc').sortable('option', 'disabled', false);
        $('> .cell > .node > .editable', this.getElement())
            .each(function(){
                this.contentEditable = 'false';
            })
            .blur();
    }

    this.startEditing = function (e) {
        $('#minddoc').sortable('option', 'disabled', true);
        editable = $('> .cell > .node > .editable', this.getElement());
        editable.each(function(){
                this.contentEditable = 'true';
            });
        setTimeout(function(){
            if (e) {
                $(e.target).focus();
            } else {
                editable.eq(0).focus();
            }
        }, 0);
    }

    this.addSibling = function () {
        node = new MindNode($(this.getElement()).parent());
        $(node.getElement()).insertAfter(this.getElement());
    }

    this.prependSibling = function () {
        node = new MindNode($(this.getElement()).parent());
        $(node.getElement()).insertBefore(this.getElement());
    }

    this.hasNextSibling = function () {
        return $(this.getElement()).next().hasClass('container');
    }

    this.getNextSibling = function () {
        if (this.hasNextSibling()) {
            return MindNode.get($(this.getElement()).next()[0].id);
        } 
        return this;
    }

    this.hasPreviousSibling = function () {
        return $(this.getElement()).prev().hasClass('container');
    }

    this.getPreviousSibling = function () {
        if (this.hasPreviousSibling()) {
            return MindNode.get($(this.getElement()).prev()[0].id);
        }
        return this;
    }

    this.hasParent = function () {
        return $(this.getElement()).parent().hasClass('container');
    }

    this.getParent = function () {
        if (this.hasParent()) {
            return MindNode.get($(this.getElement()).parent()[0].id);
        }
        return this;
    }

    this.hasChildren = function () {
        return $('> .container', this.getElement()).length > 0;
    }

    this.getFirstChild = function () {
        child = $('> .container:first', this.getElement())[0];
        if (child) {
            return MindNode.get(child.id);
        }
        return this;
    }

    this.getLastChild = function () {
        child = $('> .container:last', this.getElement())[0];
        if (child) {
            return MindNode.get(child.id);
        }
        return this;
    }

    this.getDeepestLastChildren = function () {
        if (this.hasChildren() && !this.isFolded()) {
            return this.getLastChild().getDeepestLastChildren();
        } else {
            return this;
        }
    }

    this.getPrevious = function () {
        if (this.isStub()) {
            return MindNode.get($('#minddoc > .container:last')[0].id);
        }
        return this.hasPreviousSibling() ? this.getPreviousSibling().getDeepestLastChildren() : this.getParent();
    }

    this.getFirstParentWithSibling = function () {
        if (this.getParent().hasNextSibling()) {
            return this.getParent();
        } else {
            if (this.hasParent()) {
                return this.getParent().getFirstParentWithSibling();
            } else {
                return this;
            }
        }
    }

    this.getNext = function () {
        if (this.isStub()) {
            return MindNode.get($('#minddoc > .container:first')[0].id);
        }
        return (this.hasChildren() && !this.isFolded()) ? this.getFirstChild() : 
            (this.hasNextSibling() ? this.getNextSibling() : 
                (this.getFirstParentWithSibling().hasNextSibling() ? this.getFirstParentWithSibling().getNextSibling() : this));
    }

    this.isEditing = function () {
        element = $('> .cell > .node > .head', this.getElement())[0];
        return element && element.contentEditable == 'true';
    }

    this.toggle = function () {
        el = $('> .cell > .node > .body, > .container', this.getElement());
        el.toggle();
        if (el.css('display') == 'none') {
            $('> .cell > .collapse-button', this.getElement()).addClass('unwind');
        } else {
            $('> .cell > .collapse-button', this.getElement()).removeClass('unwind');
        }
    }

    this.isFolded = function () {
        return $('> .cell > .node > .body', this.getElement()).css('display') == 'none';
    }

    this.remove = function () {
        if (!this.getElement()) {
            return;
        }
        if ($(this.getElement()).parent().hasClass('container') || this.hasNextSibling() || this.hasPreviousSibling()) {
            $('> .container').each(function(){
                node = MindNode.get(this.id);
                node.remove();
            })

            sel = null;
            if (MindNode.current().getNextSibling()) {  
                sel = MindNode.current().getNextSibling();
            }
            if (!sel && MindNode.current().getPreviousSibling()) {  
                sel = MindNode.current().getPreviousSibling();
            }
            this.deactivate();
            MindNode.remove(this);
            $(this.getElement()).remove();

            if (sel) {
                sel.activate();
            }
        }
    }

    this.moveUp = function () {
        if (this.hasPreviousSibling()) {
            $(this.getElement()).insertBefore(this.getPreviousSibling().getElement());
        }
    }

    this.moveDown = function () {
        if (this.hasNextSibling()) {
            $(this.getElement()).insertAfter(this.getNextSibling().getElement());
        }
    }

    this.moveDeeper = function () {
        if (this.hasPreviousSibling()) {
            $(this.getElement()).appendTo(this.getPreviousSibling().getElement());
        }
    }

    this.moveHigher = function () {
        if (this.hasParent()) {
            $(this.getElement()).insertAfter(this.getParent().getElement());
        }
    }

    this.cut = function () {
        $('#buffer').html('');
        MindNode.gc();
        $(this.getElement()).appendTo($('#buffer'));
    }

    this.copy = function () {
        $('#buffer').html('');
        MindNode.gc();
        $((new MindNode(this)).getElement()).appendTo($('#buffer'));
    }

    this.paste = function () {
        $('#buffer > .container').insertBefore(this.getElement());
        $('#buffer').html('');
        MindNode.gc();
    }

    this.isStub = function () {
        return !this.getElement();
    }

    if (parentNode !== 'stub') {    
        this.init(parentNode);
    }
}

MindNode.prototype = {
    // static fields
    _nodes: [],
    _current: null,
    _stub: new MindNode('stub'),
}

MindNode.get = function (id) {
    if (typeof(id) == 'number' || typeof(id) == 'string') {
        return MindNode.prototype._nodes[id];
    } else if (id && id.nodeType) {
        return MindNode.prototype._nodes[id.id];
    }
}
MindNode.add = function (node) {
    if (node && typeof(node) == 'object' && node instanceof MindNode) {
        MindNode.prototype._nodes[node._id] = node;
    }
}
MindNode.getUniqueId = function () {
    do {
        id = Math.round(1000000*Math.random());
    } while (typeof(MindNode.prototype._nodes[id]) != 'undefined');
    return id;
}
MindNode.current = function (method) {
    if (method && MindNode.prototype._current) {
        return method.call(MindNode.prototype._current);
    }
    if (MindNode.prototype._current) {
        return MindNode.prototype._current;
    } else {
        return MindNode.prototype._stub;
    }
}
MindNode.remove = function (node) {
    delete MindNode.prototype._nodes[node._id];
    if (node === MindNode.prototype._current) {
        MindNode.prototype._current = null;
    }
}
MindNode.create = function () {
    return new MindNode();
}
MindNode.gc = function () {
    arr = [];
    for (i in MindNode.prototype._nodes) {
        if (i) {
            if ($('#' + MindNode.prototype._nodes[i]).length == 0) {
                arr[i] = '';
            }
        }
    }
    for (i in arr) {
        delete MindNode.prototype._nodes[i];
    }
}

MindNode.keyMap = {
    1013: function() { // Ctrl+Enter
        MindNode.current().addSibling();
    },
    1038: function () { //Ctrl+Up
        MindNode.current().moveUp();
    },
    1040: function () { // Ctrl+Down
        MindNode.current().moveDown();
    },
    1039: function() { // Ctrl+Right
        MindNode.current().moveDeeper();
    },
    1037: function() { // Ctrl+Left
        MindNode.current().moveHigher();
    },
    1088: function () { // Ctrl+X
        MindNode.current().cut();
    },
    1067: function () { // Ctrl+C
        MindNode.current().copy();
    },
    1086: function () { // Ctrl+V
        MindNode.current().paste();
    },
    38: function() { // up
        MindNode.current().getPrevious().activate();
    },
    40: function() { // down
        MindNode.current().getNext().activate();
    },
    32: function() { // space
        MindNode.current().toggle();
    },
    45: function() { // insert
        MindNode.current().prependSibling();
    },
    46: function() { // delete
        MindNode.current().remove();
    },
    13: function () { // enter
        MindNode.current().startEditing();
    },
}

MindNode.handleKey = function (e) {
    mindCode = e.which + (e.ctrlKey ? 1000 : 0);
    if (typeof(MindNode.keyMap[mindCode]) != 'undefined') {
        MindNode.keyMap[mindCode]();
    }
}
