
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
What you don't understand is browser related details.
So you know what to do next.

Essentially the worst of it all is your virtualization logic.

So, everyday you need to decide what it is you need to do so that you can in a reasonable time period learn that in particular.

Layout shifting.

you should include the other phrases that you commonly see.
I don't want to type the wrong phrase from memory so I won't put them here
right now cause I'm exhausted and I can't bear to look it up right now to check the phrasing.

======================

7:43 AM

I had 2x quickcheck breakfast burritos

Then when I got home I set aside 4x cliff bars
- 2x chocolate chip
- 2x peanut butter

When I eat those cliff bars I intend to eat them in the sequence
chocolate chip, peanut butter, chocolate chip, peanut butter.

I also have 1 lb of 98% lean ground chicken and sriracha.

======================

Google AI Overview "web browsers: key lifecycle stages":
############```startParaphrase

...

1. Page Load Lifecycle (Populating a Web Page)
- Navigation & Request...
- Response...
- Parsing & DOM Construction...
- Style & CSSOM Construction...
- Render & Layout...
- Painting...
- Interactivity...

2. Page Lifecycle API States
- Active...
- Passive...
- Hidden...
- Frozen...
- Terminated...
- Discarded...

...

############```endParaphrase

Continuing to question from the initial prompt "after a page is loaded, how are further 'Render & Layout' handled":
############```startParaphrase

After the initial page load, any changes to the page style or structure trigger dynamic, partial lifecycle updates called
- Reflows (Layout) and
- Repaints (Painting).

To optimize performance, browsers process these changes using a highly structured Event Loop and a dedicated asynchronous pipeline.

1. The Dynamic Update Lifecycle
> When a user interacts with a loaded page
> (e.g.,
>     - clicking a button,
>     -hovering over a menu,
>     - or receiving data from an API
> ),
> the browser goes through a mini-rendering loop:

[ JavaScript Modification ] -> [ Style Recalculation ] -> [ Layout / Reflow ] -> [ Paint / Repaint ] -> [ Composite ]

- Style Recalculation: The browser figures out which CSS rules apply to which elements based on the new changes.
- Layout (Reflow): The browser calculates the geometry (sizes and positions) of the affected elements.
                   This is computationally expensive because changing one element can cause a domino effect across the whole page.
- Painting (Repaint): The browser redraws the pixels for the elements that changed colors, visibility, or backgrounds,
                      without changing their physical shape or layout.
- Compositing: The browser bundles different layers of the page (like fixed headers or video elements)
               and sends them to the GPU to be drawn together onto your screen.

2. How the Browser Schedules Updates
> Browsers do not instantly update the screen everytime a single line of JavaScript runs. Instead, they batch updates using a strict timing system:
- The Event Loop: JavaScript executes tasks sequentially. When JavaScript modifies the DOM, those changes are queued.
- The 16.7ms Target: Most screens refresh at 60 frames per second (FPS). This gives the browser a tight 16.7-millisecond window
                     to run JavaScript, calculate styles, perform layout, paint, and composite a single frame.
- Asynchronous Batching: The browser waits until the current JavaScript execution block finishes.
                         It then batches all DOM modifications together to run a single Layout and Paint cycle right before the next screen refresh.

3. Triggers: Reflow vs. Repaint
> Different actions trigger different levels of the rendering pipeline.
Action              | Pipeline Step Triggered                 | Impact           | Examples
--------------------------------------------------------------------------------------------------------------------------------------------------------
Geometry Changes    | Reflow (and subsequent Repaint)         | High CPU usage   | Changing width, height, margin, padding, or adding/removing DOM nodes
Visual Changes Only | Repaint (Skips Layout)                  | Medium CPU usage | Changing color, background-color, visibility, or outline.
GPU Accelerations   | Compositing Only (Skips Layout & Paint) | Low CPU usage    | Using CSS transform (for moving/scaling) or opacity.

4. Browser Optimizations
> Modern browsers use two main techniques to keep pages smooth and responsive after loading:
- Layout Thrashing Prevention: Browsers cache layout values. However, if your JavaScript writes a style change and immediately reads a geometric
                               property (like element.offsetHeight), it forces the browser to perform a premature, synchronous reflow.
- The Compositor Thread: Browsers split the rendering process into the Main Thread (which handles JavaScript, Layout, and Paint)
                         and the Compositor Thread (which handles GPU rendering). If you animate properties like 'transform' or 'opacity',
                         the animation bypasses the busy Main Thread entirely, keeping the frame rate high even if JavaScript is lagging.

...

############```endParaphrase

Continuing to question from the initial prompt "Tell me more about 'The Event Loop'":
############```startParaphrase

The 'Event Loop' is the secret behind JavaScript's ability to handle
- user clicks,
- network requests,
- and animations smoothly,
despite being strictly single-threaded (meaning it can only run one piece of code at a time).

Instead of freezing your browser while waiting for a server or a timer, JavaScript offloads heavy tasks to the
browser environment and uses the Event Loop to coordinate when that code executes.

1. The Code Architecture
> To understand the loop, you must understand the four distinct parts of the browser runtime working together:
- The Call Stack: This tracks exactly where you are in your program. It executes code synchronously on a Last-In, First-Out (LIFO) basis.
                  If a function is called, it pops onto the stack. When it finishes, it pops off.
- Web APIs / Browser APIs: These are background environments provided by the browser (not JavaScript itself).
                           They handle long-running operations like 'setTimeout', 'fetch()' network requests, and DOM event listeners.
- The Task Queues: When a Web API finishes its background task, it drops a callback function into a queue, waiting for its turn to execute.
- The Event Loop: A continuous, infinite loop that has one simple job: look at the Call Stack. If the Call Stack is completely empty,
                  it takes the first task from the queue and pushes it onto the Call Stack to be executed.

2. The Queue Hierarchy: Macro vs. Micro
> Not all asynchronous tasks are treated equally. The Event Loop prioritizes tasks using two different queues:
# Macro-task Queue (Task Queue)
- What it holds: Large, discrete pieces of asynchronous work.
- Examples: 'setTimeout', 'setInterval', network request callbacks, user interactions (clicks, keypresses).
- Processing Rule: The Event Loop processes exactly 'one' macro-task per loop iteration.
# Micro-task Queue
- What it holds: Smaller tasks that must happen immediately after the current script finishes, but before the browser moves on to rendering
                or the next macro-task.
- Examples: 'Promise.then()', 'async/await' continuations, 'MutationObserver'.
- Processing Rule: The Event Loop will completely 'empty' the entire micro-task queue before moving on. If a micro-task creates anotehr micro-task,
                   that new one is also run immediately.

3. Step-by-Step of a Single Loop Iteration
> Everytime the Event Loop ticks, it follows this exact order of operations.
1. Check Call Stack: Wait until the call Stack is completely empty.
2. Execute One Macro-task: Pull the oldest task from the Macro-task queue and run it until the stack clears.
3. Flush All Micro-tasks: Check the Micro-task queue. Run every single micro-task in the queue until it is 100% empty.
4. Render: Check if the screen needs a redraw (typically every 16.7ms). If yes, run 'requestAnimationFrame' and perform Layout and Paint.
5. Repeat: Start back at step 1.



############```endParaphrase
*/
