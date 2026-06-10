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
        this.rootElement.className = 'LIST_v2undecidedImplementation';
        this.rootElement.tabIndex = 0;
        /** TODO: this isn't being used? */
        this.rootElementHeightNumber = 0;
        this.rootElement.style.height = '100%';

        this.virtualizationElement = document.createElement('div');
        this.virtualizationElement.className = 'LIST_v2undecidedImplementation_virtualization';
        this.rootElement.appendChild(this.virtualizationElement);

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'LIST_v2undecidedImplementation_cursor';
        this.rootElement.appendChild(this.cursorElement);

        //this.countNonLineChildren = 2;

        // Remove the wrapper goes from 0.15 to 0.27 when using top
        //
        // TODO: wrap the individual divs that represent lines in a parent element or not...
        this.itemListElement = document.createElement('div');
        this.itemListElement.className = 'LIST_v2undecidedImplementation_itemList';
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
            and creating a 'time complexity of n' shifting wherein everytime I shift 1 line visually every other line has to be transformed +- the amount of lines I shifted.
        5. if I use transform from 0 or just top from 0 I probably am no longer doing this math relative to each other line and can change just the lines that move.
        */

        // If you don't use a containing div specifically for the lines of text you could position them
        // as the final childrenof the text editor's HTML element.
        //
        // You then have every child that comes prior be a constant count.
        // Your lines of text are then located at (0 + countOfConstantChildrenThatComePrior).
        //
        // But even then I said I'd just store a separate list myself to sort them all so I can walk the references in my own list.

        // From my understanding transform is GPU and top is main thread.

        // If you wrap the lines in a div, and meanwhile the parent of the parent of the lines is the one that has overflow scroll.
        // What kind of oddities are going in the browser calculation of the overflow of the parent of the lines.

        // How do you have the parent of the lines be completely untracked by the rendering, such that it only serves to
        // group the children.
        //
        // Because perhaps this would mean the parent of the parent of the lines of text is position: relative.
        // and then the parent of the lines is position: static.
        // And then each line is position: absolute.
        //
        // Each line then bypasses its immediate parent because position: absolute isn't relative to position: static.
        // You then tell the rendering engine to ignore the existence of the parent of the lines of text
        // and presume that the lines of text were a child of the parent of the parent of the lines of text?

        // Google AI overview
        // "HTML wrap multiple divs in a div without the parent adding overhead to the rendering because the parent of the parent is position relative
        // and every innermost div is position absolute therefore they bypass the immediate parent who is position static"
        // ############```paraphrase
        // To wrap multiple divs without adding layout overhead, use a document fragment or a semantic container with CSS display unset.
        // Since your innermost elements are position: absolute and their positioning context (containing block) is a grandparent,
        // intermediate static wrappers won't interfere with their positioning.
        //
        // ...
        // ############```paraphrase

        // Document Fragment (Web APIs)
        //     - Google AI paraphrased: "It lives entirely in memory. When you append a fragment to the actual DOM, the fragment itself disappears, and only its children are inserted."
        //     - how does this differ from a for loop that adds child nodes to an HTML element GIVEN that this for loop occurs prior to the next render. (so it is all completed in time).
        // Semantic Container

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

        this.domNodesForLines = [];

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
        //for (let i = this.rootElement.children.length - 1; i >= this.countNonLineChildren; i--) {
        //    this.rootElement.removeChild(this.rootElement.children[i]);
        //}


        this.domNodesForLines.length = 0;
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

        if ((this.itemListElement.children.length !== this.virtualCount) || (this.domNodesForLines.length !== this.virtualCount)) {
            this.draw_render_fullReset();
        }
        else {
            this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
            //this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

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
                (this.itemListElement.children.length === this.virtualCount) &&
                (this.domNodesForLines.length === this.virtualCount)) {

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

                    let topNumber = (prevVli + this._ONSCROLLvirtualCount) * this.itemHeightNumber;

                    // TODO: Perhaps use a reference linked datastructure to avoid shifting elements?

                    for (var i = 0; i < diff; i++) {
                        let indexItem = prevVli + this._ONSCROLLvirtualCount + i;
            
                        let divItem = this.domNodesForLines.shift();
                        // TODO: Should this actually be setting innerHTML to an empty string?
                        divItem.innerHTML = ''; // TODO: Don't set innerHTML to '', it triggers the HTML parser; use a different way?
                        divItem.style.transform = `translateY(${topNumber}px)`;
                        //divItem.style.top = `${topNumber}px`;
                        topNumber += this.itemHeightNumber;

                        if (indexItem >= itemsCount) {
                            this.drawItemAction(divItem, -1);
                        }
                        else {
                            this.drawItemAction(divItem, indexItem);
                        }
            
                        this.domNodesForLines.push(divItem);
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

                    let topNumber = currVli * this.itemHeightNumber;
                    
                    for (var i = 0; i < diff; i++) {
                        let indexItem = currVli + i;

                        let divItem = this.domNodesForLines.pop();
                        divItem.innerHTML = ''; // TODO: Don't set innerHTML to '', it triggers the HTML parser; use a different way?
                        divItem.style.transform = `translateY(${topNumber}px)`;
                        //divItem.style.top = `${topNumber}px`;
                        topNumber += this.itemHeightNumber;

                        if (indexItem >= itemsCount) {
                            this.drawItemAction(divItem, -1);
                        }
                        else {
                            this.drawItemAction(divItem, indexItem);
                        }
                        
                        this.domNodesForLines.unshift(divItem);
                    }
                }
                else {
                    // re-use the divs, but keep them in place and redraw over them all

                    let itemsCount = this.getItemsCountFunc();

                    let topNumber = this.virtualIndex * this.itemHeightNumber;

                    for (var i = 0; i < this.virtualCount; i++) {
                        let indexItem = i + this.virtualIndex;

                        let divItem = this.domNodesForLines[i];
                        divItem.innerHTML = ''; // TODO: Don't set innerHTML to '', it triggers the HTML parser; use a different way?
                        divItem.style.transform = `translateY(${topNumber}px)`;
                        //divItem.style.top = `${topNumber}px`;
                        topNumber += this.itemHeightNumber;

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

        /*
        It feels like every way of doing this has many reasons of its own for why it can't be the correct answer.
        And that every case has a sense of "it can't be correct".
        So then the only thing to do is to iterate through every possibility of implementing it and measuring the result.

        For the few cases I just checked I didn't set the width of the container to the largest width element that could appear...
        maybe that is the missing key idk I just gotta keep trying things cause they all sound like a bad idea.

        And I have yet to try transform, as I said I'm just going through the options and top already was being used
        so I iterated through some of those first maybe I gotta just jump into transform.
        */

        this._ONSCROLLvirtualCount = this.virtualCount;

        // I just had an idea:
        // In addition to trying transform
        //
        // if that gets me nowhere I could forgo moving the divs entirely and see if just swapping the content and order is enough to spike CLS

        this.itemListElement.innerHTML = '';
        //for (let i = this.rootElement.children.length - 1; i >= this.countNonLineChildren; i--) {
        //    this.rootElement.removeChild(this.rootElement.children[i]);
        //}

        this.domNodesForLines.length = 0;
        
        this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
        //this.itemListElement.style.transform = this.virtualIndex * this.itemHeightNumber + 'px';
        //this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

        // if you do that it messes it all up
        // maybe you could transform because
        // the transform
        // you have to transform every other line because you moved 0 but the next line needs to transform 0 but it is transform 1 * lineHeight
        // but you could for the diff size negatively transform the container and then transform the moved lines relative to the negative value.

        let itemsCount = this.getItemsCountFunc();

        let topNumber = this.virtualIndex * this.itemHeightNumber;

        for (let i = 0; i < this.virtualCount; i++) {
            // TODO: you don't break you still populate and then drawItemAction handles a null case?
            if (this.virtualIndex + i >= itemsCount) {
                break;
            }
            let divItem = document.createElement('div');
            this.domNodesForLines.push(divItem);
            //divItem.style.width = `100%`; // This goes from 0.21 to 4.9 CLS when I uncomment this line
            // ^ uncomment the line without a wrappper goes from 0.27 to 5.85
            divItem.style.height = this.itemHeightStyleAttributeValueString;
            divItem.style.position = 'absolute';
            divItem.style.transform = `translateY(${topNumber}px)`;
            //divItem.style.top = `${topNumber}px`;
            topNumber += this.itemHeightNumber;
            this.itemListElement.appendChild(divItem);
            //this.rootElement.appendChild(divItem);
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
	        this.event_scroll_timer = setTimeout(this.event_scroll_timeoutFunc, 200, this);
	    }
    }
    
    event_scroll_timeoutFunc(context) {
        if (/*trailing && lastArgs*/ context.event_scroll_bool) {
            context.event_scroll_bool = false;
            context.event_scroll();
            context.event_scroll_timer = setTimeout(context.event_scroll_timeoutFunc, 200, context);
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

        // Something along the lines of "if transformY exists why would I ever use top"
        // my prediction to this is whether you're positioning something vs animating a changing value...
        //
        // I actually wonder if transformY would effect the offsetHeight or not?
        //
        // Perhaps transform is used when throttling an occuring event.
        // And then on the trailing event if you wanted to have offsetHeight correct you'd finalize the top.
        //
        //     transform: translateY(1.16422e+06px);
        //
        // If you make the parent of the text absolute you can top a single element
        //
        // then every line of text inside of it is absolute to avoid drawing the transformY on each individual relative to a different starting position
        // with absolute they'll all be at top 0 of the parent which is top of the batch of lines
        //
        // and then the transform is the relative Y position to the parent
        // so then you re-use if oyu have 35 lines fo text you graphics re-use those 35 transform strings and move them around
        // 
        // and then just the top ofthe entire thingy has to move.
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_setIndex(index) {
        // CLS of 0
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
// it's just anxiety anxiety anxiety I need them to shut up. They mention it multiple times a day I can't take it