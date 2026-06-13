/** TODO: The decimals are being truncated by default / ought to be avoided regardless for performance? Use Math.Ceiling? */
let APP_lineHeight = 20;

init();

function APP_measureLineHeightAndCharacterWidth() {
    const body = document.getElementById('ROOT');

    const measureElement = document.createElement('div');
    measureElement.style.width = "fit-content";
    measureElement.innerText = "0";
    body.appendChild(measureElement);

    // TODO: This is currently a whole number but regardless, it presumably could end up having a decimal part.
    APP_lineHeight = Math.ceil(measureElement.offsetHeight);

    /*
    This permits me to in 'explorer.js' set the first span of every "tree-view-node"
    to be the same width, regardless of whether its content is '-', '+', or '' (an empty string).

    In theory this width calculation and 'APP_lineHeight' can be done at the same time.
    But I don't want to deal with that at the moment.
    */

    measureElement.innerText = "-";
    const minusWidth = measureElement.offsetWidth;
    measureElement.innerText = "+";
    const plusWidth = measureElement.offsetWidth;

    // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
    // ...this case isn't currently being hit...
    // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.

    const largerWidth = Math.ceil(minusWidth > plusWidth ? minusWidth : plusWidth);

    EXPLORER_firstSpanWidthValue = largerWidth;
    EXPLORER_firstSpanWidth = EXPLORER_firstSpanWidthValue + 'px';

    const root = document.documentElement;
    const computedStyles = window.getComputedStyle(root);
    const appLineHeight = APP_lineHeight + 'px';
    const propertyName = '--APP-line-height';
    if (computedStyles.getPropertyValue(propertyName) !== appLineHeight) {
        // avoid layout with if statement
        root.style.setProperty(propertyName, appLineHeight);
    }

    body.removeChild(measureElement);
}

function init() {

    document
        .getElementById('HEADER_buttonSettings')
        .addEventListener('click', async () => {
            return DIALOG_show_async(DialogKind.Settings);
        });

    window.myAPI.onMessage(async (data) => {
        EDITOR_documentSymbolResult = data;
        if (!EDITOR_listComponent) {
            EDITOR_listComponent = new ListComponent();
        }
        EDITOR_listComponent.setItems(APP_lineHeight, APP_lineHeight + 'px',
            /*drawItemAction*/ (div, index) => {
                if (index === -1) {
                    div.innerText = '';
                    div.title = '';
                    div.style.display = 'none';
                }
                else {
                    let item = EDITOR_documentSymbolResult[index];
                    div.innerText = item.name;
                    div.title = JSON.stringify(item.range.start);
                    div.style.display = '';
                }
            },
            /*onkeydownAction*/ (div, index) => {
                if (index === -1) {
                    // TODO: if (index === -1)
                }
                else {
                    // TODO: Ensure that json parsing the title like this is a safe way of doing things
                    const startPosition = JSON.parse(div.title);
                    EDITOR_moveCursor_lineIndex_columnIndex(startPosition.line, startPosition.character);
                }
            },
            /*getItemsCountFunc*/ () => {
                if (EDITOR_documentSymbolResult) {
                    return EDITOR_documentSymbolResult.length;
                }
                else {
                    return 0;
                }
            });
        return DIALOG_show_async(DialogKind.DocumentSymbol, () => {
            if (EDITOR_listComponent) {
                EDITOR_listComponent.boundingClientRect = null;
                EDITOR_listComponent.event_scroll();
            }
        });
    });

    APP_measureLineHeightAndCharacterWidth();

    const EDITOR_gotoF_button = document.getElementById('EDITOR_gotoF');
    EDITOR_gotoF_button.addEventListener('click', window.myAPI.editorDocumentSymbolsRequest);

    const body = document.getElementById('ROOT');
    body.addEventListener('keydown', async event => {
        
        switch (event.key) {
            case 's':
            case 'S':

                if (!event.ctrlKey) {
                    return;
                }

                const unvalidatedAbsolutePath = EDITOR_textSourceIdentifier;
                const rawData = EDITOR_getFinalizedEditsAndRawSaveFileData();
                if (rawData.uint8arrayTextBytes) {
                    event.preventDefault();
                    event.stopPropagation();
                    return window.myAPI.editorSaveFile(unvalidatedAbsolutePath, rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
                }

                return;
            case 'F':

                if (!event.ctrlKey) {
                    return;
                }

                return DIALOG_show_async(DialogKind.FindAll);
            case 'Escape':
            	// TODO: Provide a way to disable the next (body, and useCapture) 'Escape' keypress...
            	// ...so a widget can restore focus to the relevant UI rather than
            	// the 'EDITOR' when the user presses 'Escape' to "cancel".
				const editor = document.getElementById('EDITOR');
		        if (editor) {
		            editor.focus();
		        }
                return;
        	case 'e':
        		if (event.altKey) {
        			EXPLORER_setShow(true);
        			const EXPLORER_Element = document.getElementById('EXPLORER');
        			if (EXPLORER_Element.children.length === 1) {
        				EXPLORER_Element.children[0].focus();
        			}
        		}
                return;
            case 'E':
        		if (event.altKey && event.shiftKey) {
        			const editor = document.getElementById('EDITOR');
			        if (editor) {
			            editor.focus();
			            EXPLORER_setShow(false);
			        }
        		}
                return;
            case 'd':
        		if (event.altKey) {
        			const dialogCloseButton = document.getElementById('DIALOG_closeButton');
        			if (dialogCloseButton) {
        				dialogCloseButton.focus();
        			}
        		}
                return;
            case 'h':
        		if (event.altKey) {
        			const settingsButton = document.getElementById('HEADER_buttonSettings');
        			if (settingsButton) {
        				settingsButton.focus();
        			}
        		}
                return;
        }
    }, /*useCapture*/ true);

    MENU_init();
    EXPLORER_init();
    EDITOR_init();
}

/*
Google AI Overview "javascript do numbers as a class field carry garbage collection overhead":
############```paraphraseStart
...

The only exception: If you box a number by using the Number object constructor (e.g., this.field = new Number(42)),
it will be stored as an object on the heap and generate garbage collection. Always use the literal form (e.g., this.field = 42).

...
############```paraphraseEnd

I wanted to see what the AI would say.

It doesn't mention the cost of the marking phase wherein the GC has to confirm that the field indeed is a primitive value.

It doesn't mention the cost of heap defragmentation, wherein the number's primitive value is stored alongside the memory for the class instance.
And during defragmentation you'd then have to copy that primitive value when moving things around.

Those things I'm used to not being mentioned though it isn't a big deal I wasn't really looking for that
I figured they wouldn't be mentioned.

I just wanted to see if it said anything interesting.

The new Number(...) is an interesting point to keep in mind.


Google AI Overview "javascript does Boolean(1) box or primitive":
############```paraphraseStart
Boolean(1) returns a primitive boolean value (true).

When Boolean() is called without the new keyword, JavaScript treats it as a standard type-conversion function rather than a constructor object.

...
############```paraphraseEnd


Google AI Overview
"javascript how do I handle anxiety that const variables in a function will be hoisted to global scope and therefore exist and carry overhead in their existence for the entire duration of an application":
############```paraphraseStart
In JavaScript, const and let variables are not hoisted to the global scope.
They are block-scoped to the function and remain in memory only while the function executes.
Once the function finishes, the JavaScript engine's garbage collector safely removes them, meaning they carry zero long-term overhead.
############```paraphraseEnd

I've read this multiple times but I just can't get over the anxiety.
Not even just today but in the past.


Google AI Overview "javascript are enum definitions an object allocation":
############```paraphraseStart
JavaScript does not have native enum support. When you define an "enum" in JavaScript, you are typically creating a plain JavaScript object. Yes, this definition allocates a new object in memory at runtime.

...

TypeScript Enums (Transpiled to JS)

If you are writing TypeScript and using the native enum keyword, the way it compiles affects memory:
- Standard enum: Compiles into a bidirectional JavaScript object (allowing both forward and reverse lookups by key and value). This allocates a runtime object.
- const enum: Compiles away completely. The TypeScript compiler inlines the raw values directly into your code, resulting in zero object allocations at runtime.

...
############```paraphraseEnd
*/
