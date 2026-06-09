/**
 * When in doubt, behavior should replicate that of an HTML element if applicable.
 * i.e.: What happens if I try to show this in two separate places at the same time?
 * - You remove the current parent prior to drawing it at the new parent with the given child index.
 * - TODO: Are you sure you have it written in a way that conforms to your statements made above ^...
 *     - I think I recall adding event listeners to an HTML element prior to having the element having a parent, and then upon
 *           giving it a parent, the event listeners weren't working.
 *           - Is this true? / are there other oddities you don't expect involved?
 * 
 * Now that I think about it... would it be possible / sensible to somehow tell JavaScript this "inherits" an HTML element or something like this?
 * I looked and it seems possible but I'm not sure I want to do this. It kinda gives me the ick (at least at first glance)
 */
class ListComponent_v2undecidedImplementation {
    /**
     * @param {*} itemHeight invoker provides or does this class calculate it?
     * TODO: itemHeight is never used
     */
    constructor(itemHeight) {
        
        /**
         * @type {HTMLDivElement}
         */
        this.rootElement = document.createElement('div');
        this.rootElement.className = 'LIST';
        this.rootElement.tabIndex = 0;
        /** TODO: this isn't being used? */
        this.rootElementHeightNumber = 0;
        this.rootElement.style.height = '100%';

        this.virtualizationElement = document.createElement('div');
        this.virtualizationElement.className = 'LIST_virtualization';
        this.rootElement.appendChild(this.virtualizationElement);

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'LIST_cursor';
        this.rootElement.appendChild(this.cursorElement);

        // TODO: wrap the individual divs that represent lines in a parent element or not...
        this.itemListElement = document.createElement('div');
        this.itemListElement.className = 'LIST_itemList';
        this.rootElement.appendChild(this.itemListElement);

        // TODO: You could separately store the sorted divs and use that separate store to map "virtual indices" to the content displayed on screen...
        // ...while being able to use any div at any position in the DOM itself and change the top CSS value to whatever you wanted.

        // NOTE: What I'm describing is the falacy that currently exists in my mind. And likely what I need to do is just not do what I thinking about...
        // ...but I want to still describe my reasoning up until this point.
        //
        // TODO: You are worried about a full screen render needing to calculate the top for every line of text being displayed...
        // ...meanwhile you already are creating multiple strings of much longer lengths foreach span that provides syntax highlighting to the various chunks of text that exist on the div.
        //
        // TODO: Because of this worry you think you should be wrapping the lines in a parent div who's sole responsibility is to provide a relative...
        // ...position for the children.
        // ...this means you can on a full screen render calculate the top for the parent div, then have the child lines of text...
        // ...be 'position: static' and just fall into place correctly relative to the parent without calculating an individual top foreach of them.
        //
        // Because of your worry about full screen renders, you would need to separate into 3 cases:
        // - positive diffs
        //     - set position to absolute and calculate a top foreach line that is being moved.
        // - negative diffs
        //     - set position to absolute and calculate a top foreach line that is being moved.
        // - full screen renders
        //     - set position to static and calculate a top only for the parent div.
        //
        // So then each time you draw the list there'd be a mixture of lines that are position static without a top value.
        // Because they're in the same position as they were from the last full screen render.
        //
        // And mixed into that is the lines that given your current scroll position relative to the last full screen render
        // you need to reposition those lines
        // so you gave them position absolute and a top.

        // The other concern is doing a for loop over every line of text in the virtualization result.
        // This sounds extremely expensive.
        // As well, given that I don't simply have "innerText" but instead have 1 or many spans.
        // I'd somehow have to move those span nodes around and I'm back where I started... i.e.: I'm moving nodes and possibly causing a layout shift again.

        // So stop thinking about the full screen render because you need to just get this first step to work.
        // First step being... not having a bad cumulative layout shift.

        // The second concern is that I continually map from a line index to a virtual index to a DOM element so that
        // I can draw the user's edits before they actually happen.
        //
        // If I do this oddity where child at index 0 isn't visually the 0th line then I have to
        // track separately where the 0th visual element starts.
        //
        // Then as I draw lines I need to increment from there and wrap back around to 0 when I overflow into the count of total children.
        // And all the while I keep updating where the next element is to pull from.
        //
        // OR I just track this zeroth element in a separate list of my own and say forget the list they appear in the DOM.

        /*
        There is a very large issue in my understanding of garbage collection.
        I cannot fully pinpoint the cost of an allocation whether it be short term or long term.
        
        And I think it is because I fail to understand how the browser renders content.
        And this failure to understand that results in the browser's rendering steps blowing up the GC
        unrelated to what I'm doing (enough to cause me confusion).

        What I mean is, I'm not causing 0 gc overhead I definitely cause GC overhead.
        But my failure to understand how the browser renders is probably
        where MASSIVE amounts of GC overhead are occurring and then I'm sitting here everyday
        thinking what am I doing in my code to cause so much GC overhead.

        Either that or I'm misattributing the thrashing of the layout to be a freeze of the app due to a GC collection
        and that both their side effects are visually similar to some degree.
        */


        /*
        So I can store my own sorted list of the lines of text.
        Then use either transform or top.

        The issue with wrapping them all in a div with a single top then transforming each line relative to one another is
        1. the idea that a full screen render of 34 lines of text calculating 34 top css strings isn't nearly as big a deal as I give credit to it
        2. the cost of item 1 exists but is far less than that of the thrashing that I introduce by trying to avoid item 1
        3. I lost my train of thought
        4. Oh if I transform the lines relative to that parent element then I am furthermore transforming the lines relative to one another
            and creating a log(n) shifting wherein everytime I shift 1 line visually every other line has to be transformed +- the amount of lines I shifted.
        5. if I use transform from 0 or just top from 0 I probably am no longer doing this math relative to each other line and can change just the lines that move.
        */

        this.itemHeightTotal = 0;

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorIndex = 0;

        /**
         * This relates to how many extra items will be rendered beyond what naively would fit at an equal scrollTop down to filling the viewport height.
         * 
         * TODO: This isn't being used?
         */
        this.virtualPadding = 1;

        this._ONSCROLLscrollTop = 0;
        this._ONSCROLLvirtualIndex = 0;
        this._ONSCROLLvirtualCount = 0;
        
        this.event_scroll_timer = null;
        this.event_scroll_bool = false;

        this.bound_event_click = this.event_click.bind(this);
        this.bound_event_keydown = this.event_keydown.bind(this);
        this.bound_event_scroll_WRAPIT = this.event_scroll_WRAPIT.bind(this);
        this.bound_event_windowResize = this.event_windowResize.bind(this);

        /**
         * It could be useful to inherit HTML element due to storage, you'd have to hold a null reference that you can set
         * or store a array of 'List' to somehow hold the reference.
         * 
         * If you inherit HTML element the document likely could do the "storage" of the reference
         * 
         * So then for this reason, you want to be able to understand the context of the section in the app you are working within.
         * This tells you how many ListComponent you need "worst case scenario"
         * 
         * If a certain section of the app only needs to show 1 list at any given moment, you can allocate a single ListComponent
         * and re-use it.
         * 
         * Meanwhile some other section might be displaying 2 lists, so they'd allocate 2 ListComponent.
         * 
         * And if desirable you can set your section's ListComponent to null when you aren't using it
         * with the goal of GC collecting the instance during the time that it isn't being used.
         */
    }

    /**
     * 
     * @param {*} itemHeightNumber '50'; cursorTop = currentIndex * itemHeightNumber;
     * @param {*} itemHeightStyleAttributeValueString '50px'; div.style.height = itemHeightStyleAttributeValueString;
     * @param {*} drawItemAction receives the div that represents the individual item in the list, the index of the item OR -1 to indicate the function should clear the div because there is no entry at that location (need to handle null item due to when viewport isn't filled). This div is empty, and you can do "whatever you want to it" provided the height stays consistent.
     * @param {*} onkeydownAction receives the div that represents the individual item in the list, the index of the item OR -1 to indicate there is no entry at that location.
     * @param {*} getItemsCountFunc returns the total count of items
     */
    setItems(itemHeightNumber, itemHeightStyleAttributeValueString, drawItemAction, onkeydownAction, getItemsCountFunc) {

        this.itemListElement.innerHTML = '';
        this.virtualizationElement.style.height = 1 + 'px';
        this.state_cursor_setIndex(0);

        this.itemHeightNumber = itemHeightNumber;
        this.itemHeightStyleAttributeValueString = itemHeightStyleAttributeValueString;
        /** receives the div that represents the individual item in the list, the index of the item, and the item itself. This div is empty, and you can do "whatever you want to it" provided the height stays consistent. */
        this.drawItemAction = drawItemAction;
        /** receives the div that represents the individual item in the list, the index of the item, and the item itself. */
        this.onkeydownAction = onkeydownAction;

        this.cursorElement.style.height = this.itemHeightStyleAttributeValueString;
        this.getItemsCountFunc = getItemsCountFunc;
        this.itemHeightTotal = this.getItemsCountFunc() * this.itemHeightNumber;
        this.virtualizationElement.style.height = this.itemHeightTotal + 'px';
        this.boundingClientRect = null;
    }

    /**
     * if (this.rootElement.parentElement) return;
     * Because the "list" is already drawn somewhere and 'draw_delete()' needs to be invoked prior to drawing at a different location.
     * 
     * @param {HTMLElement} parentElement 
     * @param {*} insertBeforeThisChild (if falsey, the list UI is appended to the parent element)
     */
    draw_create(parentElement, insertBeforeThisChild) {
        if (this.rootElement.parentElement) return;
        parentElement.insertBefore(this.rootElement, insertBeforeThisChild);
        this.draw_addEvents();
        this.draw_render();
    }

    /**
     * if (!this.rootElement.parentElement) return;
     * Because the "list" is not drawn, no UI needs to be removed.
     * (the purpose of this method is more-so related to unsubscribing of events and other such non-automatic actions that need to be performed)
     * 
     * @returns 
     */
    draw_delete() {
        if (!this.rootElement.parentElement) return;
        this.draw_removeEvents();
        this.boundingClientRect = null;
        this.rootElement.parentElement.removeChild(this.rootElement);
    }

    draw_addEvents() {
        this.rootElement.addEventListener('click', this.bound_event_click);
        this.rootElement.addEventListener('keydown', this.bound_event_keydown);
        this.rootElement.addEventListener('scroll', this.bound_event_scroll_WRAPIT);
        window.addEventListener('resize', this.bound_event_windowResize);
    }
    
    draw_removeEvents() {
        this.rootElement.removeEventListener('click', this.bound_event_click);
        this.rootElement.removeEventListener('keydown', this.bound_event_keydown);
        this.rootElement.removeEventListener('scroll', this.bound_event_scroll_WRAPIT);
        window.removeEventListener('resize', this.bound_event_windowResize);
    }

    draw_render() {
        if (!this.boundingClientRect) {
            this.ensure_boundingClientRect();
        }

        if (this.itemListElement.children.length !== this.virtualCount) {
            this.draw_render_fullReset();
        }
        else {
            this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
            this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

            if (this._ONSCROLLscrollTop === this.rootElement.scrollTop &&
                this._ONSCROLLvirtualIndex === this.virtualIndex &&
                this._ONSCROLLvirtualCount === this.virtualCount) {
                    return;
            }

            this._ONSCROLLscrollTop = this.rootElement.scrollTop;

            // If I delay setting 'this._ONSCROLLvirtualIndex' then I can just use that.
            // I can't bear to do that right now though. I'm just gonna make this variable.
            let prevVli = this._ONSCROLLvirtualIndex;
            let currVli = this.virtualIndex;

            this._ONSCROLLvirtualIndex = this.virtualIndex;

            if (this._ONSCROLLvirtualCount === this.virtualCount &&
                this.itemListElement.children.length === this.virtualCount) {

                // The same count of lines is on the UI so you can probably
                // redraw them one by one and save "some" of the existing HTML.

                let diff = currVli - prevVli;

                // There are 3 cases:
                // - move small lines to end of list with the content changed
                // - move the final lines to the start with the content changed
                // - keep lines in place and redraw over them all

                if (diff > 0 && diff < this.virtualCount) {
                    
                    // move small lines to end of list with the content changed

                    // scrolled down and a non-zero amount of the content is re-useable
                    // thus, draw the larger index item into the smallest index div of the previous render
                    // then append that same smalled div so that it now is being used to show a larger

                    // I don't want to get caught up in any unnecessary complexity so I'm gonna isolate a single case
                    // by duplicating the code and only my singular case hits the new code that I'm adding.
                    //
                    // It's possible the single case is the solution to every case.
                    // But moreso mentally the problem is easier to approach from an anxiety/procrastination perspective.

                    let firstIndexLineThatWasNotAlreadyRendered = prevVli + this._ONSCROLLvirtualCount;

                    let itemsCount = this.getItemsCountFunc();

                    for (var i = 0; i < diff; i++) {
                        let indexItem = prevVli + this._ONSCROLLvirtualCount + i;
            
                        let divItem = this.itemListElement.children[0];
                        // TODO: Should this actually be setting innerHTML to an empty string?
                        divItem.innerHTML = '';

                        if (indexItem >= itemsCount) {
                            this.drawItemAction(divItem, -1);
                        }
                        else {
                            this.drawItemAction(divItem, indexItem);
                        }
            
                        this.itemListElement.appendChild(divItem);
                    }
                }
                else if (diff < 0 && (diff *= -1) < this.virtualCount) {

                    // move the final lines to the start

                    // move large lines to start of list with the content changed

                    // TODO: You might want to have the cutoff be earlier than count, the shifting of the children might be more expensive then the previous way of things at a point earlier than count...
                    // ...in fact since this scroll up case has to insert and shift, it is more expensive than the append.
                    // and an in bulk function is probably highly valuable here.
                    //
                    // It might faster to copy the content around to each existing node.
                    // 
                    // Although I'm not even sure if it does shift internally or not I'm only presuming that.

                    // To reduce shifting you could either:
                    // - Get a reference to all the divs you'll re-use then remove them in bulk
                    // - Ensure you do the lower indices first, so that you can insert AFTER the previously moved divs rather than continually incurring the shift of every element in the list (or maybe every element except 1 cause it doesn't get shifted it moreso gets moved idk)

                    let itemsCount = this.getItemsCountFunc();
                    
                    for (var i = 0; i < diff; i++) {
                        let indexItem = currVli + i;

                        let divItem = this.itemListElement.children[this.itemListElement.children.length - 1];
                        divItem.innerHTML = '';

                        if (indexItem >= itemsCount) {
                            this.drawItemAction(divItem, -1);
                        }
                        else {
                            this.drawItemAction(divItem, indexItem);
                        }
                        
                        this.itemListElement.insertBefore(divItem, this.itemListElement.children[i]);
                    }
                }
                else {
                    // re-use the divs, but keep them in place and redraw over them all

                    let itemsCount = this.getItemsCountFunc();

                    for (var i = 0; i < this.virtualCount; i++) {
                        let indexItem = i + this.virtualIndex;

                        let divItem = this.itemListElement.children[i];
                        divItem.innerHTML = '';

                        if (indexItem >= itemsCount) {
                            this.drawItemAction(divItem, -1);
                        }
                        else {
                            this.drawItemAction(divItem, indexItem);
                        }
                    }
                }
            }
        }
    }

    draw_render_fullReset() {

        this._ONSCROLLvirtualCount = this.virtualCount;

        this.itemListElement.innerHTML = '';
        
        this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
        this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

        let itemsCount = this.getItemsCountFunc();

        for (let i = 0; i < this.virtualCount; i++) {
            // TODO: you don't break you still populate and then drawItemAction handles a null case?
            if (this.virtualIndex + i >= itemsCount) {
                break;
            }
            let divItem = document.createElement('div');
            divItem.style.height = this.itemHeightStyleAttributeValueString;
            this.itemListElement.appendChild(divItem);
            this.drawItemAction(divItem, this.virtualIndex + i);
        }
    }

    event_click(event) {
        this.ensure_boundingClientRect();

        let rY = event.clientY - this.boundingClientRect.top + this.rootElement.scrollTop;
        let index = Math.floor(rY / this.itemHeightNumber);
        index = this.state_cursor_validateIndex(index);
        this.state_cursor_setIndex(index);
    }
    
    event_keydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex + 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex - 1));
                break;
            case ' ':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex));
                let relativeIndex = this.cursorIndex - this.virtualIndex;
                if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                    this.onkeydownAction(this.itemListElement.children[relativeIndex], this.cursorIndex);
                }
                break;
        }
    }

    /**
     * intra-app resizes or movements will also invoke this; i.e.: if a list is shown in a dialog and the dialog is resized or moved.
     */
    event_windowResize() {
        this.boundingClientRect = null;
    }
    
    event_scroll_WRAPIT() {
        this.event_scroll_bool = true;
	    if (!this.event_scroll_timer) {
	    	this.event_scroll();
	        this.event_scroll_timer = setTimeout(this.event_scroll_timeoutFunc, 100, this);
	    }
    }
    
    event_scroll_timeoutFunc(context) {
        if (/*trailing && lastArgs*/ context.event_scroll_bool) {
            context.event_scroll_bool = false;
            context.event_scroll();
            context.event_scroll_timer = setTimeout(context.event_scroll_timeoutFunc, 100, context);
        } else {
            context.event_scroll_timer = null;
        }
    }
    
    event_scroll() {
        this.draw_render();
    }

    ensure_boundingClientRect() {
        if (!this.boundingClientRect) {
            this.boundingClientRect = this.rootElement.getBoundingClientRect();
            this.virtualCount = Math.ceil(this.rootElement.offsetHeight / this.itemHeightNumber);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_setIndex(index) {
        if (this.cursorIndex === index) return;

        this.cursorIndex = index;
        this.cursorTopNumber = this.cursorIndex * this.itemHeightNumber;
        this.cursorElement.style.top = this.cursorTopNumber + 'px';

        this.ensure_boundingClientRect();

        if (this.cursorTopNumber + (2 * this.itemHeightNumber) > this.rootElement.scrollTop + this.boundingClientRect.height) {
            let currentBottom = this.rootElement.scrollTop + this.boundingClientRect.height;
            let changeToMakeBottomTouch = this.cursorTopNumber - currentBottom;
            let entireValueToScrollBy = changeToMakeBottomTouch + (2 * this.itemHeightNumber);
            this.rootElement.scrollBy(0, entireValueToScrollBy);
        }
        else if (this.cursorTopNumber < this.rootElement.scrollTop) {
            this.rootElement.scrollBy(0, this.cursorTopNumber - this.rootElement.scrollTop);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_validateIndex(index) {
        let itemsCount = this.getItemsCountFunc();
        if (index >= itemsCount) {
            index = itemsCount - 1;
        }
        if (index < 0) {
            index = 0;
        }
        return index;
    }
}
