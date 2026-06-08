
const WidgetKind = {
    None: 0,
    InputText: 1,
    YesCancel: 2,
};

let WIDGET_currentWidgetKind = WidgetKind.None;
/** A delegate of the form: async ({ isCancelled = false, value = '' }) => {}; */
let WIDGET_currentCallback = null;
let WIDGET_restoreFocusToElement = null;
let WIDGET_left = 0;
let WIDGET_top = 0;

/*
In C++... something about boolean vs boolean in an array maybe something about smallest addressable space or something...
is JavaScript the same?

Google AI Overview "c++ boolean size vs vector size":
```paraphrase
In C++, a standalone bool typically occupies 1 byte (8 bits) of memory, whereas the elements inside a std::vector<bool> are specialized
to occupy only 1 bit each through an internal optimization called bit-packing.

...CPUs address memory at the byte level...
```

Primitives aren't stored on the heap? No issue of heap defragmentation is involved here?
But still you're during the mark stage of a GC collection you have to check that the variable is a primitive boolean which has an
extremely small but non-zero cost right?

Actually I was thinking from the perspective of a global variable that the primitives wouldn't be stored on the heap.
But, an object instance that has boolean fields.
You'd probably have a stack stored reference that points to the heap wherein the boolean exists.

A local variable would likely be a stack stored reference that is marked in such a way that the engine knows to read
the pointer value as a primitive value. So local and globals are probably similar in behavior.
It is particularly the boolean fields that could 8x contribute to heap defragmentation copying overhead.

And for clarification yes the stack stored scenarios are 8x the storage but you aren't worrying about heap defragmentation is my point...
but then again when it comes to allocating a stack frame you need to allocate 8x the memory for the local variable.
*/

// The variable 'WIDGET_element' is "implicitly" being accessed here.
document.getElementById('WIDGET').style.visibility = 'hidden';

// You aren't focusing the widget element itself so blur likely won't work.
//WIDGET_element.addEventListener('focusout', () => WIDGET_hide());

function WIDGET_show(widgetKind, left, top, placeholder, callback) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (WIDGET_currentWidgetKind !== WidgetKind.None) {
        WIDGET_hide(true);
    }
    WIDGET_left = left;
    WIDGET_top = top;
    WIDGET_restoreFocusToElement = document.activeElement;
    WIDGET_currentWidgetKind = widgetKind;
    WIDGET_currentCallback = callback;

    WIDGET_element.style.left = WIDGET_left + 'px';
    WIDGET_element.style.top = WIDGET_top + 'px';
    WIDGET_element.style.visibility = '';

    switch (widgetKind) {
        case WidgetKind.InputText:
            WIDGET_CreateInputText(placeholder);
            break;
        case WidgetKind.YesCancel:
            WIDGET_CreateYesCancel(placeholder);
            break;
    }
}

function WIDGET_hide(shouldRestoreFocus) {

    WIDGET_currentCallback = null;

    const WIDGET_element = document.getElementById('WIDGET');

    switch (WIDGET_currentWidgetKind) {
        case WidgetKind.InputText:
            let input = document.getElementById('WIDGET_inputText');
            input.removeEventListener('keydown', WIDGET_inputTextOnKeyDown);
            break;
        case WidgetKind.YesCancel:
            let yesButtonElement = document.getElementById('WIDGET_YesCancel_yes');
            yesButtonElement.removeEventListener('onclick', WIDGET_YesCancelButtonOnClick_yes);
            let cancelButtonElement = document.getElementById('WIDGET_YesCancel_cancel');
            cancelButtonElement.removeEventListener('onclick', WIDGET_YesCancelButtonOnClick_cancel);
            break;
    }
    WIDGET_element.innerHTML = '';
    WIDGET_element.style.visibility = 'hidden';
    WIDGET_currentWidgetKind = WidgetKind.None;
    if (shouldRestoreFocus && WIDGET_restoreFocusToElement)
        WIDGET_restoreFocusToElement.focus();
}

async function WIDGET_inputTextOnKeyDown(event) {
    if (event.key === 'Enter') {
        let input = document.getElementById('WIDGET_inputText');
        if (WIDGET_currentCallback) {
            await WIDGET_currentCallback({
                isCancelled: false,
                value: input.value
            });
        }
        WIDGET_hide(true);
    }
    else if (event.key === 'Escape') {
        let input = document.getElementById('WIDGET_inputText');
        if (WIDGET_currentCallback) {
            await WIDGET_currentCallback({
                isCancelled: true,
                value: input.value
            });
        }
        WIDGET_hide(true);
    }
}

async function WIDGET_YesCancelButtonOnClick_yes(event) {
    if (WIDGET_currentCallback) {
        await WIDGET_currentCallback({
            isCancelled: false,
            value: 'Yes'
        });
    }
    WIDGET_hide(true);
}

async function WIDGET_YesCancelButtonOnClick_cancel(event) {
    if (WIDGET_currentCallback) {
        await WIDGET_currentCallback({
            isCancelled: true,
            value: 'Cancel'
        });
    }
    WIDGET_hide(true);
}

function WIDGET_CreateInputText(placeholder) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (!placeholder)
        placeholder = '';

    let input = document.createElement('input');
    input.type = "text";
    input.placeholder = placeholder;
    input.id = 'WIDGET_inputText';
    input.addEventListener('keydown', WIDGET_inputTextOnKeyDown.bind(this));
    WIDGET_element.appendChild(input);
    input.focus();
}

function WIDGET_CreateYesCancel(placeholder) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (!placeholder)
        placeholder = '';

    let topDivElement = document.createElement('div');
    topDivElement.innerText = placeholder;

    let bottomDivElement = document.createElement('div');
    let yesButtonElement = document.createElement('button');
    yesButtonElement.innerText = 'Yes';
    yesButtonElement.id = 'WIDGET_YesCancel_yes';
    yesButtonElement.addEventListener('click', WIDGET_YesCancelButtonOnClick_yes);
    bottomDivElement.appendChild(yesButtonElement);
    let cancelButtonElement = document.createElement('button');
    cancelButtonElement.innerText = 'Cancel';
    cancelButtonElement.id = 'WIDGET_YesCancel_cancel';
    cancelButtonElement.addEventListener('click', WIDGET_YesCancelButtonOnClick_cancel);
    bottomDivElement.appendChild(cancelButtonElement);

    WIDGET_element.appendChild(topDivElement);
    WIDGET_element.appendChild(bottomDivElement);
    yesButtonElement.focus();
}

/*
2026-06-08:

# Breakfast:
1 fairlife elite milk
3 everything bagels
(I have 1 more since I purchased 4 in total but I'm not gonna eat the 4th one yet)

# Lunch / Dinner
98% lean ground chicken
with sriracha sauce

If I eat bagels in the future I need to cut it into smaller pieces.
I was biting directly into the bagel.
I was eating them plain without cutting it in half.
What I was referring to was though not to cut it in half but to cut it
into bite sized pieces.

Because I was biting into the entire bagel each time and then ripping / pulling / biting through
with my teeth
but my teeth feel crooked now as though they've moved due to each bite so I need to cut it ahead of time
so that my teeth to don't shift as I eat.

I've been feeling like I am exhausted lately.
So trying these bagels to see if I feel any diff.

I been feeling exhausted lately and I need to
just get 1 hour at least
of something that is fatiguing to some measurable degree.

Because I don't want to write code lately.
But this happens constantly.
And the way to get through it is to just daily
do something
and then eventually
you'll enjoy it again.

Maybe the menu needs a widget
but then maybe the menu can be
a null menu option list
and I can populate it myself
because the cost of it
if too very high
but also that I need
to show a "menu" at various places
but not use a simple "menu" but instead
some kind of list because it will
virtualize and or I can even show like a tree view or something.

7:27 AM

goto f needs to be a "select dropdown"
where when I move cursor it updates to the encompassing definition/globalScope
and then I click it and I get the definitions from the lsp
and then I can click on one and goto it.

As well every HTML element that you show you need to have the least necessary amount of HTML required to implement a feature otherwise
you're allocating to the DOM and for no reason so it is gc expensive.

*/
