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
            EDITOR_listComponent = new ListComponent_moveChildNodes();
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

    /*
    // callstack hits 'init();'
    // ... await would schedule this as a micro-task
    // .... but it doesn't have an await...
    // ... synchronously executes the asynchronous function until an await
    // ... then returns to the outer synchronous function and does a somewhat 'fire and forget' scenario.
    //
    // Goole AI says the following sentence: "after the synchronous function has fully cleared off the Call Stack—the background Web API finishes, dumps the async function's callback into the Micro-task Queue, and the remainder of the async function finally finishes executing."
    //
    // I'm not sure if I fully understand that sentence.
    // "background Web API finishes"
    DIALOG_show_async(DialogKind.Debug, () => {
        if (DEBUG_listComponent) {
            DEBUG_listComponent.boundingClientRect = null;
            DEBUG_listComponent.event_scroll();
        }
    });
    */
}

// CLS of editor I just saw 8.0 so I'm gonna look at it.
// CLS of editor 0.7

/*
List of 'get_EDITOR_virtualLineIndex' of interest:
==================================================
- [ ] EDITOR_duplicateSelection_drawUi
- [ ] EDITOR_indentMore
- [ ] EDITOR_indentLess
- [ ] EDITOR_paste
- [ ] EDITOR_EnterKey
- [ ] EDITOR_REMOVE_line_drawGutter
- [ ] EDITOR_deleteDo
- [ ] EDITOR_backspaceDo


~~~~~~~~~~~~~~~~~~~~~~


List of 'get_EDITOR_textElement()' of interest:
===============================================
- [x] walkLineUntilColumnIndex
- [x] EDITOR_appendSimpleLine
- [x] EDITOR_measureLineHeightAndCharacterWidth
- [x] EDITOR_finalizeEdit
- [ ] EDITOR_duplicateSelection_drawUi
- [x] EDITOR_indentMore
- [ ] EDITOR_indentLess
- [ ] EDITOR_paste
- [ ] EDITOR_EnterKey
- [ ] EDITOR_onScroll
- [x] EDITOR_createViewport
- [ ] EDITOR_removeSelection
- [ ] EDITOR_deleteDo
- [ ] EDITOR_backspaceDo


~~~~~~~~~~~~~~~~~~~~~~


List of combined and unique interests:
======================================
- [x] walkLineUntilColumnIndex
- [x] EDITOR_appendSimpleLine
- [x] EDITOR_measureLineHeightAndCharacterWidth
- [x] EDITOR_finalizeEdit
- [/] EDITOR_duplicateSelection_drawUi
- [x] EDITOR_indentMore
- [x] EDITOR_indentLess
- [/] EDITOR_paste
- [/] EDITOR_EnterKey
- [ ] EDITOR_onScroll
    - [ ] I think scrolling the mouse wheel up (to a smaller scrollTop) isn't working properly.
- [x] EDITOR_createViewport
- [/] EDITOR_REMOVE_line_drawGutter
- [/] EDITOR_removeSelection
- [x] EDITOR_deleteDo
- [x] EDITOR_backspaceDo

*/
