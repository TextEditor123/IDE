/*
########################
########################

IMPORTANT: This file is compiled with babel during a build step and written to the repo's build directory...
...when modifying a file ensure you are modifying the correct version.

Whether the babel compilation build step I'm doing actually accomplishes anything I have no idea.
But I like it for the time being and I'll continue thinking about it,
if I can do something with it, if what I am doing is even meaningful or like etc...

########################
########################
*/

let EDITOR_trackedSyntaxList = new TrackedSyntaxList(32);

// What about if there is any overhead relating to const global numbers?
const ASCII_LINE_FEED = 10;
const ASCII_TAB = 9;
const ASCII_SPACE = 32;

/**
 * @type {UInt32List}
 */
let EDITOR_findOverlay_searchResultPositionList;
let EDITOR_textByteList = new ByteList(1024);
const EDITOR_encoder = new TextEncoder();
const EDITOR_decoder = new TextDecoder();
class EDITOR_Cursor {
  static STATIC_CURSOR_ID = 1;
  /**
   * I'm not sure how large I want this, what matters is that I just have a size of anything for the time being, then can change this constant later.
   */
  static GAP_BUFFER_CAPACITY = 32;

  /**
   * After invoking the constructor you likely would want to add to:
   * - get_EDITOR_cursorListElement(),
   * - EDITOR_cursorList,
   * 
   * `get_EDITOR_cursorListElement().appendChild(cursorInstance.caretRow)`
   * `EDITOR_cursorList.splice(index, 0, cursorInstance)`
   */
  constructor() {
    this.indexLine = 0;
    this.indexColumn = 0;
    /**
     * When moving cursor vertically, if the current column index cannot be matched due to the upcoming line being too short,
     * then this will allow a later vertical movement to a line that is long enough to match the original column rather than the minimized one.
     */
    this.STORED_indexColumn = 0;
    this.cursorTopValue = 0;
    this.cursorLeftValue = 0;
    this.selectionAnchor = 0;
    this.selectionEnd = 0;
    this.DRAWN_selectionAnchor = 0;
    this.DRAWN_selectionEnd = 0;
    this.DRAWN_selection_virtualLineIndex = 0;
    this.DRAWN_selection_virtualCount = 0;
    this.editKind = 0;
    this.editLength = 0;
    this.editPosition = 0;
    this.editIndexLine = 0;
    this.editIndexColumn = 0;
    this.END_editIndexLine = 0;
    this.END_editIndexColumn = 0;
    // TODO: This is supposed to say 'cursorId'
    this.cursorIndex = EDITOR_Cursor.STATIC_CURSOR_ID++;
    this.htmlId = "EDITOR_cursor-" + this.cursorIndex;

    /**
     * When this is cleared the information is not removed, only 'gapBufferCount' is set to 0.
     */
    this.gapBuffer = new Uint8Array(EDITOR_Cursor.GAP_BUFFER_CAPACITY);
    this.gapBufferCount = 0;
    this.gapBufferWriteToSpanElement = null;
    this.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
    this.caretRow = document.createElement('div');
    this.caretRow.id = "EDITOR_caretRow-" + this.cursorIndex;
    this.caretRow.className = "EDITOR_caretRow";
    this.cursorElement = document.createElement('div');
    this.cursorElement.id = "EDITOR_cursor-" + this.cursorIndex;
    this.cursorElement.className = "EDITOR_cursor";
    this.caretRow.appendChild(this.cursorElement);

    /**
     * Upon an enter keystroke this is inserted onto the newly added line.
     * 
     * The value is stored here to avoid high overhead from indentation matching when holding down the Enter key.
     * 
     * TODO: ^ that being said, you preferably wouldn't store this string allocation long term. If a more "localized" caching can be implemented, that would be preferable. (or the timing upon which this is set to null)
     * 
     * TODO: Don't null this just change the count to 0 and use a separate bool to indicate "nullness". UNLESS if clearing cache and this is for some reason MASSIVE idk maybe > 256 then maybe clear it idk
     * 
     * TODO: clear these when setting text, if not already? My code isn't working so I can't give a better TODO than this
     * 
     * @type {ByteList | null}
     */
    this.cached_indentation_byteList = null;
    this.cached_indentation_string = null;
    this.enterKeyEventKind = 0;

    /**
     * TODO: probably is sensible to use this for the enter key too but I'm firstly adding it for the sake of backspace so
     * I don't have to waste time looping over the removed text to find the line end positions that are being removed.
     * (I could do some kind of other tracking but I chose not to for no particular reason, well I think I chose this one out of laziness and that the other solutions long term like a
     *  list at the editor level 1 of them that is shared among all cursors is probably better or something.)
     * 
     * ========
     * 
     * TODO: Cursor should store this as -1 to signify false,
     * and then it is a number 0 to ... the offset in the pending line end position list
     * and then you have another number too separately that says the length of line endings that this cursor contributed to modifying.
     */
    this.editLineFeedCount = 0;

    /**
     * TODO: Consider putting this at the editor level and then delay setting it to null until all cursors have made use of it?...
     * ...an NRE is thrown with this at the editor level so I'm moving it per cursor but...
     * Then again it is only multiple references, not multiple separate objects...
     */
    this.EDITOR_paste_clipboardContent = null;

    /** same comment that pertains to this.EDITOR_paste_clipboardContent is somewhat relevant here */
    this.EDITOR_duplicate_small = 0;
    /** same comment that pertains to this.EDITOR_paste_clipboardContent is somewhat relevant here */
    this.EDITOR_duplicate_length = 0;
  }
  hasSelection() {
    return this.selectionAnchor >= 0 && this.selectionEnd >= 0 && this.selectionAnchor != this.selectionEnd;
  }

  /**
   * The code that clears the editor is dependent on this method NOT clearing 'cursor.selectionDivExists'
   * 
   * Somewhat duplicated code: This messes with the language features if I invoke clear() in the constructor, it puts "| undefined" on all the types.
   */
  clear() {
    this.indexLine = 0;
    this.indexColumn = 0;
    this.STORED_indexColumn = 0;
    this.cursorTopValue = 0;
    this.cursorLeftValue = 0;
    this.selectionAnchor = 0;
    this.selectionEnd = 0;
    this.DRAWN_selectionAnchor = 0;
    this.DRAWN_selectionEnd = 0;
    this.DRAWN_selection_virtualLineIndex = 0;
    this.DRAWN_selection_virtualCount = 0;
    this.editKind = 0;
    this.editLength = 0;
    this.editPosition = 0;
    this.editIndexLine = 0;
    this.editIndexColumn = 0;
    this.END_editIndexLine = 0;
    this.END_editIndexColumn = 0;
    this.gapBufferCount = 0;
    this.cached_indentation_byteList = null;
    this.cached_indentation_string = null;
    this.enterKeyEventKind = 0;
    this.editLineFeedCount = 0;
    this.EDITOR_paste_clipboardContent = null;
    this.EDITOR_duplicate_small = 0;
    this.EDITOR_duplicate_length = 0;
  }

  /**
   * Not all properties are necessarily cloned in this method:
   */
  clone() {
    let clone = new EDITOR_Cursor();
    clone.indexLine = this.indexLine;
    clone.indexColumn = this.indexColumn;
    clone.STORED_indexColumn = this.STORED_indexColumn;
    clone.cursorTopValue = this.cursorTopValue;
    clone.cursorLeftValue = this.cursorLeftValue;
    return clone;
  }
}
const EDITOR_baseElement = document.getElementById('EDITOR');

/* TODO: Caching the get_... for the HTML elements is perhaps beneficial in various places of the code and still is preferable to caching a 'document.getElementById'. */

const EDITOR_debug = document.getElementById('EDITOR_debug');
const EDITOR_findOverlay = document.getElementById('EDITOR_findOverlay');
EDITOR_findOverlay.style.visibility = 'hidden';
const EDITOR_tab_tabsbytes = new Uint8Array(4);
EDITOR_tab_tabsbytes[0] = ASCII_TAB;
EDITOR_tab_tabsbytes[1] = 0;
EDITOR_tab_tabsbytes[2] = 0;
EDITOR_tab_tabsbytes[3] = 0;
const EDITOR_tab_spacesbytes = new Uint8Array(4);
EDITOR_tab_spacesbytes[0] = ASCII_SPACE;
EDITOR_tab_spacesbytes[1] = ASCII_SPACE;
EDITOR_tab_spacesbytes[2] = ASCII_SPACE;
EDITOR_tab_spacesbytes[3] = ASCII_SPACE;
/**
 * Null characters provide visual width for proportional fonts. They do not get copied or saved out.
 */
let EDITOR_on_tab_bytes = EDITOR_tab_tabsbytes;

/**
 * When a cursor removes a line end the position of the line end is stored in this list until the edit is finalized.
 */
let EDITOR_lineEndPositionList_PENDING = new UInt32List(128);

/**
 * IMPORTANT: use EDITOR_readLineEndPositionList(...) rather than indexing into this directly...
 * ...due to the possibility of pending edits.
 */
let EDITOR_lineEndPositionList = new UInt32List(128);
let EDITOR_primaryCursor = new EDITOR_Cursor();
EDITOR_baseElement.children[4].children[1].appendChild(EDITOR_primaryCursor.caretRow);
/**
 * Ensure that the cursors are sorted ascending by positionIndex (which is calculated via the method 'EDITOR_getPositionIndex(...)') at all times.
 */
let EDITOR_cursorList = [EDITOR_primaryCursor];
let EDITOR_textSourceIdentifier = '';
let EDITOR_FORMATTED_textSourceIdentifier = '';
let EDITOR_extensionKind = 0;
let EDITOR_lineEndString = null;
let EDITOR_documentSymbolResult;
/**
 * @type {ListComponent}
 */
let EDITOR_listComponent = null;
let EDITOR_onMouseMove_timer = null;
let EDITOR_onMouseMove_event = null;
let didChangeTextDocumentNotificationPromise = null;
let EDITOR_onResize_timer = null;
let EDITOR_onResize_bool = null;
let EDITOR_offsetWithinSpan_withRespectToThisSpan = null;
let EDITOR_timer = null;

// TODO: - [ ] how could it possibly inline a function if the function isn't const? (this is in relation to the keyword 'function' rather than a const fat arrow function.)

/**
 * having a boolean be a byte isn't ideal, but most engines store them as either 4bytes or 8bytes
 * 
 * primarily the goal is to remove the variable from the marking phase of gc.
 * because the boolean variable could store anything so the gc still has to check that it still stores a primitive
 * and that takes time albeit a small amount of time.
 * */
const EDITOR_byte_fields = new Uint8Array(16);

/** returns a number, beware '===' */

/** returns a number, beware '===' */

EDITOR_byte_fields[1] = 1;

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/** returns a number, beware '===' */

/**
 * If you have an extension listed here, it is expected that the "function to invoke" exists.
 * As of right now any patterns to naming the function that gets invoked are tentative.
 * But I am not checking whether JS_full_lex or JS_line_lex exist, I'm just switching on ExtensionKind and presuming that function exists.
 */

/**
 * DeleteLtr and BackspaceRtl are both forms of removing text,
 * their edits are stored the same (i.e.: both in "the form of a delete" keypress)
 * The kind delete/backspace tells you how to restore the cursor when doing a ctrl+z and etc...?
 */

/**
 * TODO: Long term this likely should be removed and all enter key logic reduced into an insertion but this will help in the time being.
 */

/**
 * Do not change the order/values of these, they are used in equality comparisons, the larger the number says when double clicking between a character and a punctuation
 * whoever has larger number gets selected then the selection continues while the same kind is being read.
 * 
 * TODO: Bug only 1 character selected when punctuation then letterOrDigit click between them the letterOrDigit is more than 1 contiguous only 1 selected.
 */

const EDITOR_int_fields = new Uint32Array(32);
EDITOR_int_fields[2] = 20;

/**
 * Pixels.
 * 
 * The gutter width changes far more frequently than the line height.
 * That is why the gutter width is a JavaScript variable, and the styles are updated from JavaScript.
 * 
 * Whereas the line height is a css variable (and thus could cause layout for the entire application whenever it changes).
 */

EDITOR_int_fields[6] = 32;

/**
 * This is the sum of the 'get_EDITOR_gutterWidthStyleValue()' in addition to the left and right padding
 */

EDITOR_int_fields[7] = 32;

/** The first line of text that you should see shown in the UI given the current scrollTop */

/**
 * Prevent earlier members of a then chain from marking didChangeTextDocumentNotificationPromise to null
 * in order to signify resolved
 * 
 * when meanwhile there is more promises in the .then chain that need to resolve.
 * 
 * prefix increment
 */

/**
 * All the 'EDITOR_cursorList' loops are currently using the variable 'i'.
 * I'm experimenting with a few of the loops though such that at the start of every loop they set this variable equal to 'i'.
 * Then in any functions like getCharacter, I might be able to contextually find the character much faster.
 * */

//throw new Error('-1');
// This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
EDITOR_int_fields[18] = 500;
EDITOR_int_fields[19] = 0;
//throw new Error('-1');
// This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
EDITOR_int_fields[20] = 500;

/**
 * The get_EDITOR_contentWidth() is calculated via Math.ceil(someVar * otherVar) so this is faster to check whether content width will change rather than the multiplication and ceil.
 */

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */

let EDITOR_pooledTrackedSyntax_trackedSyntaxKind = TrackedSyntaxKind.None;
const EDITOR_gutterPaddingLeft = 3;
const EDITOR_gutterPaddingRight = 6;
let EDITOR_characterWidth = 8;
let EDITOR_horizontal_scrollbar_widthValue = 0;
function EDITOR_init() {
  EDITOR_measureLineHeightAndCharacterWidth();
  EDITOR_baseElement.children[3].children[0].style.paddingLeft = EDITOR_gutterPaddingLeft + 'px';
  EDITOR_baseElement.children[3].children[0].style.paddingRight = EDITOR_gutterPaddingRight + 'px';
  EDITOR_baseElement.children[3].children[0].style.width = EDITOR_characterWidth + 'px';
  let left = EDITOR_gutterPaddingLeft + EDITOR_gutterPaddingRight + EDITOR_characterWidth + 'px';
  let width = 'calc(100% - ' + left + ')';
  EDITOR_baseElement.children[4].style.marginLeft = left;
  EDITOR_baseElement.children[4].style.width = width;
  EDITOR_drawHorizontalScrollbar();
  EDITOR_registerHandlers();
}

/**
 * @param {*} indexLine
 * @returns {number} the last valid POSITION index on the line, but with respect to any pending edits.
 */
function EDITOR_readLineEndPositionList(indexLine) {
  let lineEndPositionIndex = EDITOR_lineEndPositionList.data[indexLine];

  // If you need to determine the text without finalizing an edit, you DO have to loop forwards right?
  for (var i = 0; i < EDITOR_cursorList.length; i++) {
    let cursor = EDITOR_cursorList[i];
    if (cursor.editLength > 0 & cursor.editPosition <= lineEndPositionIndex) {
      switch (cursor.editKind) {
        case 1:
          lineEndPositionIndex += cursor.editLength;
          break;
        case 2:
        case 3:
        case 4:
          lineEndPositionIndex -= cursor.editLength;
          break;
      }
    }
  }
  return lineEndPositionIndex;
}
function EDITOR_clear() {
  EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
  EDITOR_primaryCursor.clear();
  EDITOR_clearSelectionStyle(EDITOR_primaryCursor);
  EDITOR_byte_fields[1] = 1;
  EDITOR_textSourceIdentifier = '';
  EDITOR_FORMATTED_textSourceIdentifier = '';
  EDITOR_extensionKind = 0;
  EDITOR_byte_fields[5] = false;
  EDITOR_lineEndString = null;
  EDITOR_baseElement.children[4].children[2].innerHTML = '';
  EDITOR_lineEndPositionList.clear();
  EDITOR_baseElement.children[3].children[0].innerHTML = '';
  EDITOR_textByteList.clear();
  EDITOR_int_fields[21] = 0;
  EDITOR_int_fields[22] = 0;

  // Explicitly inlining 'clearMulticursorState()' because it currently is and I just don't want to make a decision about this right now.
  // So what I can do is mark the code paragraph for later decision making.
  EDITOR_int_fields[12] = 0;
  EDITOR_int_fields[13] = 0;
  EDITOR_int_fields[14] = 0;
  EDITOR_int_fields[15] = 0;
  EDITOR_int_fields[16] = 0;
  EDITOR_offsetWithinSpan_withRespectToThisSpan = null;
  EDITOR_int_fields[17] = 0;
  EDITOR_trackedSyntaxList.clear();
  EDITOR_drawCursor(EDITOR_primaryCursor);
}

/**
 * This function finalizes any pending edits foreach cursor in the EDITOR_cursorList.
 * 
 * Does NOT clear multicursors, only finalizes their respective edits;
 * 
 * see also: 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'
 * 
 * TODO: many places where this is invoked, it is likely intended to actually invoke 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...in order to permit slow 1 by 1 support for multicursor foreach scenario...
 * ...actually that's a good point...
 * ...you might wanna start by enabling multi-cursor insertion, but anything else invokes 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...then you can slowly add in support without breaking things?...
 * ...so specifically what I'm saying here is, an upcoming task would be...
 * ...simply to ensure that nearly every event invokes 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...and that the ones which can't i.e.: batch insertions; you could do a check if cursor count >1 then finalize only the non-primary or some such...
 * ...then you remove the safeguard for 1 feature at a time.
 */
function EDITOR_finalizeAllCursors() {
  for (let i = EDITOR_cursorList.length - 1; i >= 0; i--) {
    EDITOR_finalizeEdit(EDITOR_cursorList[i]);
  }
}

/**
 * This function finalizes pending edits foreach cursor in the EDITOR_cursorList
 * AND removes any non-EDITOR_primaryCursor from the EDITOR_cursorList.
 * 
 * see also: 'EDITOR_finalizeAllCursors'
 * 
 * TODO: a good name for this function
 */
function EDITOR_finalizeAllCursors_andClearNonPrimaryCursors() {
  for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
    let cursor = EDITOR_cursorList[i];
    EDITOR_finalizeEdit(cursor);
    if (cursor !== EDITOR_primaryCursor) {
      // A cursor is not necessarily rendered, thus this check
      if (cursor.caretRow.parentElement === EDITOR_baseElement.children[4].children[1]) {
        EDITOR_baseElement.children[4].children[1].removeChild(cursor.caretRow);
      }
      EDITOR_clearSelectionStyle(cursor);
      EDITOR_cursorList.splice(i, 1);
    }
  }
}

/**
 * Returns the underlying uint8array that contains the encoded characters for the text.
 * The uint8array's capacity (i.e.: length) is not what should be saved out.
 * Instead only save the countOfBytesInUse.
 * 
 * The editor stores all line endings as '\n'.
 * When saving the bytes, swap out any '\n' for the 'lineEndString' which may or may not be '\n' (i.e.: it could be '\r\n' or '\r').
 * 
 * Tab characters are stored as '\t\0\0\0'.
 * When saving out the bytes you need to skip over these '\0' characters.
 * 
 * A '\0' character does NOT terminate the subarray's bytes that are in use.
 * You need to iterate specifically for 'countOfBytesInUse'.
 * 
 * @param {*} NOTfinalizePendingEdits if there is a pending edit, it needs to be finalized in order to see the updated text. The default behavior is to finalize the pending edits. To use default behavior, do NOT provide the parameter, or provide a falsey expression like 'null'.
 * @returns
 */
function EDITOR_getFinalizedEditsAndRawSaveFileData(NOTfinalizePendingEdits) {
  if (!NOTfinalizePendingEdits) {
    EDITOR_finalizeAllCursors();
  }
  return {
    uint8arrayTextBytes: EDITOR_textByteList.bytes,
    countOfBytesInUse: EDITOR_textByteList.count,
    lineEndString: EDITOR_lineEndString,
    fileStartsWithBom: Boolean(EDITOR_byte_fields[5])
  };
}

/**
 * 
 * @param {string} text 
 * @param {string} textSourceIdentifier I intend to have this be an absolute path. Then when the app saves a file, it can verify against the database that this absolute path is "safe" and then write to the file.
 * @param {string} lineEndString pass null (or do not include the parameter) to have line endings set to the first encountered kind in the text. Otherwise specify here. The string is used EXACTLY AS PROVIDED if non-falsey.
 */
function EDITOR_setText(text, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString) {
  EDITOR_clear();
  EDITOR_byte_fields[5] = fileStartsWithBom;
  EDITOR_textSourceIdentifier = textSourceIdentifier;
  EDITOR_FORMATTED_textSourceIdentifier = FORMATTED_textSourceIdentifier;
  EDITOR_extensionKind = extensionKind;
  EDITOR_language_line_lex_SET(EDITOR_extensionKind);
  EDITOR_lineEndString = lineEndString;

  // When doing a "full reset" it is easier to just add EOF at the end.
  EDITOR_lineEndPositionList.clear();

  /**
   * TODO: I don't know whether I should calculate this from the EDITOR_lineEndPositionList or some such...
   * ...But all in all this detail is nothing relative to me starting the code that tracks the longest line
   * so I stop drawing the horizontal scrollbar during some scroll events.
   * 
   * In terms of changing it after the fact it isn't a big deal is what I mean.
   */
  let lineLength = 0;
  for (var sourceI = 0; sourceI < text.length; sourceI++) {
    switch (text[sourceI]) {
      case '\r':
        if (sourceI < text.length - 1 & text[sourceI + 1] === '\n') {
          if (!EDITOR_lineEndString) {
            EDITOR_lineEndString = '\r\n';
          }
          sourceI++;
        } else {
          if (!EDITOR_lineEndString) {
            EDITOR_lineEndString = '\r';
          }
        }
        if (lineLength > EDITOR_int_fields[22]) {
          EDITOR_int_fields[22] = lineLength;
          EDITOR_int_fields[21] = EDITOR_lineEndPositionList.count;
        }
        lineLength = 0;
        EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);
        EDITOR_textByteList.insert(EDITOR_textByteList.count, ASCII_LINE_FEED);
        break;
      case '\n':
        if (!EDITOR_lineEndString) {
          EDITOR_lineEndString = '\n';
        }
        if (lineLength > EDITOR_int_fields[22]) {
          EDITOR_int_fields[22] = lineLength;
          EDITOR_int_fields[21] = EDITOR_lineEndPositionList.count;
        }
        lineLength = 0;
        EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);
        EDITOR_textByteList.insert(EDITOR_textByteList.count, ASCII_LINE_FEED);
        break;
      case '\t':
        lineLength += 4;
        EDITOR_textByteList.insertBytes(EDITOR_textByteList.count, EDITOR_tab_tabsbytes, /*offset*/0, /*length*/4);
        break;
      default:
        lineLength++;
        // TODO: add a function for '.add' and avoid the "pointless" passing of count in scenarios like this.
        //
        // tbh: TODO: 'charCodeAt' also might be more allocation expensive than you expect. It returns a JavaScript number. Switching and returning an index from byte array prehardcoded might avoid an allocation per number returned?
        // ... although I hear most engines store numbers such that the pointer represents the value and you avoid the allocation but even then where is the metadata that tells you how to read that pointer differently than the other ones etc...
        //
        EDITOR_textByteList.insert(EDITOR_textByteList.count, text.charCodeAt(sourceI));
        break;
    }
  }
  EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);
  update_VirtualLineIndex();
  update_virtualCount();
  update_verticalVirtualizationBoundary();
  switch (EDITOR_extensionKind) {
    case 1:
      EDITOR_trackedSyntaxList = JS_full_lex(EDITOR_textByteList.bytes, EDITOR_textByteList.count);
      break;
  }
  EDITOR_drawGutter_Width();
  // Force 'case 3' within 'EDITOR_onScroll();' downstream
  EDITOR_int_fields[18] = EDITOR_int_fields[9];
  EDITOR_onScroll();
}

/**
 * You may want to update the vertical virtualization boundary prior to actually updating the EDITOR_lineEndPositionList.
 * Thus this function takes a 'lineCount' which defaults to EDITOR_lineEndPositionList.count if falsey.
 * @param {number | null | undefined} lineCount In order to permit arbitrarily updating the vertical virtualization boundary, this takes a lineCount. If falsey, then EDITOR_lineEndPositionList.count is used.
 */
function update_verticalVirtualizationBoundary(lineCount) {
  if (!lineCount) lineCount = EDITOR_lineEndPositionList.count;
  EDITOR_baseElement.children[1].style.height = (lineCount + EDITOR_int_fields[9] - 1) * EDITOR_int_fields[2] + 'px';
}
function update_VirtualLineIndex() {
  EDITOR_int_fields[8] = Math.floor(EDITOR_baseElement.scrollTop / EDITOR_int_fields[2]);
  let top = EDITOR_int_fields[8] * EDITOR_int_fields[2] + 'px';
  EDITOR_baseElement.children[3].children[0].style.top = top;
  EDITOR_baseElement.children[4].children[2].style.top = top;
}
function update_virtualCount() {
  EDITOR_int_fields[9] = Math.ceil(EDITOR_baseElement.offsetHeight / EDITOR_int_fields[2]);
}

/**
 * If the 'get_EDITOR_drawn_count_of_digits_longest_line_number() === positiveNumbersOnly_countDigitsLoop(EDITOR_lineEndPositionList.count)'
 * then the function does nothing.
 * 
 * TODO: Track the min and max until length changes and then only 2 operations at worst case than while
 */
function EDITOR_drawGutter_Width() {
  let digitCountOfLargestLineNumber = positiveNumbersOnly_countDigitsLoop(EDITOR_lineEndPositionList.count);
  if (EDITOR_int_fields[1] === digitCountOfLargestLineNumber) return;
  EDITOR_int_fields[1] = digitCountOfLargestLineNumber;
  EDITOR_int_fields[6] = Math.ceil(digitCountOfLargestLineNumber * EDITOR_characterWidth);
  EDITOR_int_fields[7] = EDITOR_int_fields[6] + EDITOR_gutterPaddingLeft + EDITOR_gutterPaddingRight;
  EDITOR_baseElement.children[3].children[0].style.width = EDITOR_int_fields[6] + 'px';
  let left = EDITOR_int_fields[7] + 'px';
  let width = 'calc(100% - ' + left + ')';
  EDITOR_baseElement.children[4].style.marginLeft = left;
  EDITOR_baseElement.children[4].style.width = width;
  EDITOR_drawHorizontalScrollbar();
}

/**
 * If the state is bad then the following is returned:
 * { goalColumnI: -1, runColumnI: -1, indexChild: -1, lineDiv: null, };
 * 
 * if (walked.goalColumnI === -1) { throw new Error('walked.goalColumnI === -1'); }
 * 
 * if (walked.lineDiv.children.length === 0) { throw new Error('walked.lineDiv.children.length === 0'); }
 * 
 * NOTE: when copying and pasting code be sure the snippet uses the respective 'break' or 'return' that you're interested in...
 * ...as those keywords are common in code that use the result of this function, but can vary on a case by case basis.
 * 
 * @param {EDITOR_Cursor} cursor
 * @returns
 */
function walkLineUntilColumnIndex(cursor) {
  let indexLine_VirtualRelative = cursor.indexLine + EDITOR_int_fields[13] - EDITOR_int_fields[8];
  if (cursor.indexLine >= EDITOR_lineEndPositionList.count || indexLine_VirtualRelative >= EDITOR_baseElement.children[4].children[2].children.length || indexLine_VirtualRelative < 0) {
    return {
      indexColumn_Goal: -1,
      indexColumn_Sum: -1,
      indexColumn_SpanTextContentRelative: -1,
      indexSpan: -1,
      span: null,
      div: null
    };
  }
  let div = EDITOR_baseElement.children[4].children[2].children[indexLine_VirtualRelative];
  let indexColumn_Goal = cursor.indexColumn + EDITOR_int_fields[15];
  let indexColumn_Sum = 0;
  for (var indexSpan = 0; indexSpan < div.children.length; indexSpan++) {
    let span = div.children[indexSpan];
    if (indexColumn_Goal <= indexColumn_Sum + span.textContent.length) {
      // '<=' because end-of-line text insertion (end of line but prior to the line ending itself).
      // The line ending isn't written to the span, it is represented by the encompassing div itself.
      return {
        indexColumn_Goal: indexColumn_Goal,
        indexColumn_Sum: indexColumn_Sum,
        indexColumn_SpanTextContentRelative: indexColumn_Goal - indexColumn_Sum,
        indexSpan: indexSpan,
        span: span,
        div: div
      };
    } else {
      indexColumn_Sum += span.textContent.length;
    }
  }

  // TODO: When the column index is too large, how should this be handled?
  return {
    indexColumn_Goal: -1,
    indexColumn_Sum: -1,
    indexColumn_SpanTextContentRelative: -1,
    indexSpan: -1,
    span: null,
    div: null
  };
}

/**
 * Use case: HTML was previously rendered, but the content of the line was modified
 * and logic to more efficiently manipulate the existing HTML is not yet written.
 * 
 * Example modifications:
 * - The same line index had its contents modified.
 * - Visually the line index that virtually appears as that child element is not the same as it previously was
 *   due to various reasons, perhaps a change in scroll position.
 * 
 * Prior to invoking this function ensure the provided elements's innerHTML is empty:
 * - "gutterLineElement.innerHTML = '';"
 * - "divElement.innerHTML = '';"
 * @param {number} indexLine 
 * @param {HTMLElement} gutterLineElement 
 * @param {HTMLElement} divElement 
 */
function EDITOR_drawLine(indexLine, gutterLineElement, textLineElement) {
  if (indexLine >= EDITOR_lineEndPositionList.count) {
    gutterLineElement.innerText = '~';
  } else {
    gutterLineElement.innerText = indexLine + 1;
  }
  let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(indexLine);
  if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
    trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
  }
  let line = EDITOR_getLineBoundaryPositions(indexLine);
  EDITOR_createSpansForLineOfText(textLineElement, line.start, line.end, trackedSyntax_StartingIndex);
}

/**
 * if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) { trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract; }
 * @param {*} indexLine 
 * @returns 
 */
function EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(indexLine) {
  let line = EDITOR_getLineBoundaryPositions(indexLine);
  let positionIndex = line.start;
  let left = 0;
  let right = EDITOR_trackedSyntaxList.count_abstract - 1;
  let lineIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    EDITOR_trackedSyntaxList.getElementAt(mid);
    if (EDITOR_int_fields[30] + EDITOR_int_fields[31] > positionIndex) {
      lineIndex = mid;
      if (EDITOR_int_fields[30] === positionIndex) {
        break;
      }
      right = mid - 1;
    } else if (EDITOR_int_fields[30] + EDITOR_int_fields[31] <= positionIndex) {
      left = mid + 1;
    } else {
      return; // NaN
    }
  }
  return lineIndex;
}

/**
 * if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) { trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract; }
 * Probably should make 1 of these and accept a predicate.
 */
function EDITOR_trackedSyntaxReposition_find(positionIndex) {
  let left = 0;
  let right = EDITOR_trackedSyntaxList.count_abstract - 1;
  let lineIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    let start = EDITOR_trackedSyntaxList.getStart(mid);
    if (positionIndex <= start) {
      lineIndex = mid;
      if (positionIndex === start) {
        break;
      }
      right = mid - 1;
    } else if (positionIndex > start) {
      left = mid + 1;
    } else {
      return; // NaN
    }
  }
  return lineIndex;
}

/** modification of Google AI Overview "javascript count of digits" */
function positiveNumbersOnly_countDigitsLoop(number) {
  if (number <= 0) return 1;
  let count = 0;
  while (number > 0) {
    number = Math.floor(number / 10); // Remove the last digit
    count++; // Increment the count
  }
  return count;
}

/**
 * The returned div contains a single span which is empty.
 * This div is NOT added to get_EDITOR_textElement().
 */
function EDITOR_getNewAndEmptyLineElement() {
  let div = document.createElement('div');
  div.className = 'eT';
  let span = document.createElement('span');
  div.appendChild(span);
  return div;
}
function EDITOR_appendSimpleLine(string) {
  let div = document.createElement('div');
  div.className = 'eT';
  let span = document.createElement('span');
  span.innerText = string;
  div.appendChild(span);
  EDITOR_baseElement.children[4].children[2].appendChild(div);
}

/**
 * This method will NOT "put a cursor on screen". You need to ensure
 * your cursor exists as a child by appendChild'ing to EDTIOR_cursorListElement.
 * This method instead only moves a cursor that ALREADY is being shown on screen.
 * 
 * If the 'cursor' is not EDITOR_primaryCursor, then the 'NOTscrollCursorIntoView' parameter has no effect.
 * i.e.: only the EDITOR_primaryCursor will ever be scrolled into view via this method.
 * 
 * @param {EDITOR_Cursor} cursor 
 * @param {boolean} NOTscrollCursorIntoView 
 */
function EDITOR_drawCursor(cursor, NOTscrollCursorIntoView) {
  cursor.cursorTopValue = (cursor.indexLine + EDITOR_int_fields[13]) * EDITOR_int_fields[2];
  cursor.cursorLeftValue = (cursor.indexColumn + EDITOR_int_fields[15]) * EDITOR_characterWidth;
  cursor.caretRow.style.top = cursor.cursorTopValue + 'px';
  cursor.cursorElement.style.left = cursor.cursorLeftValue + 'px';
  EDITOR_createStyleForSelection(cursor);
  if (cursor === EDITOR_primaryCursor) {
    EDITOR_debug.innerHTML = '';
    EDITOR_debug.innerText += '(' + cursor.indexLine + ', ' + cursor.indexColumn + ')';
    if (DIALOG_Settings_editorDebugShowAdjacentCharacters) {
      let previous = EDITOR_getCharacterPrevious(cursor.indexColumn, EDITOR_getPositionIndex(cursor));
      if (previous === '\n') previous = '\\n';else if (previous === '\t') previous = '\\t';
      let current = EDITOR_getCharacterCurrent(cursor.indexColumn, EDITOR_getPositionIndex(cursor), EDITOR_getLineEnd_pos(cursor.indexLine));
      if (current === '\n') current = '\\n';else if (current === '\t') current = '\\t';
      EDITOR_debug.innerText += ' | (' + previous + ', ' + current + ')';
    }
    EDITOR_debug.innerText += ' | (' + cursor.editLength + ')';
    EDITOR_debug.innerText += ' | (' + EDITOR_int_fields[21] + ', ' + EDITOR_int_fields[22] + ')';
    if (!NOTscrollCursorIntoView) {
      EDITOR_scrollCursorIntoView(cursor);
    }
  }
}
function EDITOR_getLineAndColumnIndices_raw(positionIndex) {
  let left = 0;
  let right = EDITOR_lineEndPositionList.count - 1;
  let lineIndex = -1;
  let columnIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (EDITOR_lineEndPositionList.data[mid] >= positionIndex) {
      lineIndex = mid;
      if (EDITOR_lineEndPositionList.data[mid] === positionIndex) {
        break;
      }
      right = mid - 1;
    } else if (EDITOR_lineEndPositionList.data[mid] < positionIndex) {
      left = mid + 1;
    } else {
      return; // NaN
    }
  }
  if (lineIndex === -1) {
    return {
      indexLine: 0,
      indexColumn: 0
    };
  }
  if (lineIndex === 0) {
    columnIndex = positionIndex;
  } else {
    columnIndex = positionIndex - (EDITOR_lineEndPositionList.data[lineIndex - 1] + 1);
  }
  return {
    indexLine: lineIndex,
    indexColumn: columnIndex
  };
}
function EDITOR_getLineAndColumnIndices(positionIndex) {
  let left = 0;
  let right = EDITOR_lineEndPositionList.count - 1;
  let lineIndex = -1;
  let columnIndex = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (EDITOR_readLineEndPositionList(mid) >= positionIndex) {
      lineIndex = mid;
      if (EDITOR_readLineEndPositionList(mid) === positionIndex) {
        break;
      }
      right = mid - 1;
    } else if (EDITOR_readLineEndPositionList(mid) < positionIndex) {
      left = mid + 1;
    } else {
      return; // NaN
    }
  }
  if (lineIndex === -1) {
    return {
      indexLine: 0,
      indexColumn: 0
    };
  }
  if (lineIndex === 0) {
    columnIndex = positionIndex;
  } else {
    columnIndex = positionIndex - (EDITOR_readLineEndPositionList(lineIndex - 1) + 1);
  }
  return {
    indexLine: lineIndex,
    indexColumn: columnIndex
  };
}

/**
 * This function only clears both the 'cursor.selectionDivExists' and the HTML associated with the selection NOT the actual selection position properties of the cursor.
 * 
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_clearSelectionStyle(cursor) {
  let shouldExistSelectionDiv = false;
  if (cursor.selectionDivExists) {
    for (var i = 0; i < EDITOR_baseElement.children[4].children[0].children.length; i++) {
      if (EDITOR_baseElement.children[4].children[0].children[i].id === cursor.htmlId) {
        let textSelectionDiv = EDITOR_baseElement.children[4].children[0].children[i];
        if (!shouldExistSelectionDiv) {
          EDITOR_baseElement.children[4].children[0].removeChild(textSelectionDiv);
          cursor.selectionDivExists = false;
        }
        break;
      }
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_createStyleForSelection(cursor) {
  if (cursor.DRAWN_selectionAnchor !== cursor.selectionAnchor || cursor.DRAWN_selectionEnd !== cursor.selectionEnd || cursor.DRAWN_selection_virtualCount !== EDITOR_int_fields[9] || cursor.DRAWN_selection_virtualLineIndex !== EDITOR_int_fields[8]) {
    cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
    cursor.DRAWN_selectionEnd = cursor.selectionEnd;
    cursor.DRAWN_selection_virtualCount = EDITOR_int_fields[9];
    cursor.DRAWN_selection_virtualLineIndex = EDITOR_int_fields[8];
    let shouldExistSelectionDiv;
    if (cursor.DRAWN_selectionAnchor === cursor.DRAWN_selectionEnd) {
      shouldExistSelectionDiv = false;
    } else {
      shouldExistSelectionDiv = true;
    }
    let textSelectionDiv;
    if (cursor.selectionDivExists) {
      for (var i = 0; i < EDITOR_baseElement.children[4].children[0].children.length; i++) {
        if (EDITOR_baseElement.children[4].children[0].children[i].id === cursor.htmlId) {
          textSelectionDiv = EDITOR_baseElement.children[4].children[0].children[i];
          if (!shouldExistSelectionDiv) {
            EDITOR_baseElement.children[4].children[0].removeChild(textSelectionDiv);
            cursor.selectionDivExists = false;
          }
          break;
        }
      }
    } else if (shouldExistSelectionDiv) {
      textSelectionDiv = document.createElement('div');
      textSelectionDiv.id = cursor.htmlId;
      EDITOR_baseElement.children[4].children[0].appendChild(textSelectionDiv);
      cursor.selectionDivExists = true;
    }
    if (!cursor.selectionDivExists) return;

    // TODO: only somewhat simple viewport based virtualization is implemented from what I remember. i.e.: I think the divs are re-used, but every div is redrawn for the viewport, rather than only recalculating the css for the divs that came or left the viewport.

    let start = cursor.selectionAnchor;
    let startLineAndColumnIndices = EDITOR_getLineAndColumnIndices(start);
    let startLine = startLineAndColumnIndices.indexLine;
    let startColumn = startLineAndColumnIndices.indexColumn;
    let end = cursor.selectionEnd;
    let endLineAndColumnIndices = EDITOR_getLineAndColumnIndices(end);
    let INCLUSIVEendLine = endLineAndColumnIndices.indexLine;
    let INCLUSIVEendColumn = endLineAndColumnIndices.indexColumn;

    // # Virtualization
    if (startLine < EDITOR_int_fields[8]) {
      startLine = EDITOR_int_fields[8];
      startColumn = 0;
    }
    let lastLineIndexBeingShown = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
    if (INCLUSIVEendLine > lastLineIndexBeingShown) {
      INCLUSIVEendLine = lastLineIndexBeingShown;
      INCLUSIVEendColumn = EDITOR_getLastValidIndexColumn(INCLUSIVEendLine);
    }
    if (start > end) {
      let temp = end;
      let tempLine = INCLUSIVEendLine;
      let tempColumn = INCLUSIVEendColumn;
      end = start;
      INCLUSIVEendLine = startLine;
      INCLUSIVEendColumn = startColumn;
      start = temp;
      startLine = tempLine;
      startColumn = tempColumn;
    }
    //
    // I do not want to fill the screen with display:none divs for when there is a selection to be shown there (I do it all the time but it doesn't seem sensible here).
    // Thus the first step is to ensure there are a matching amount of divs for the selections to apply their style to.
    //
    let selectedLineCount = INCLUSIVEendLine - startLine + 1;
    if (textSelectionDiv.children.length < selectedLineCount) {
      for (let i = textSelectionDiv.children.length; i < selectedLineCount; i++) {
        textSelectionDiv.appendChild(document.createElement('div'));
      }
    } else if (textSelectionDiv.children.length > selectedLineCount) {
      for (let i = selectedLineCount; i < textSelectionDiv.children.length; i++) {
        textSelectionDiv.removeChild(textSelectionDiv.children[i]);
      }
    }
    let lineSelectionDiv;
    let childDivIndex = 0;
    if (startLine == INCLUSIVEendLine) {
      lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
      lineSelectionDiv.className = 'EDITOR_selection';
      lineSelectionDiv.style.left = startColumn * EDITOR_characterWidth + 'px';
      lineSelectionDiv.style.top = EDITOR_int_fields[2] * startLine + 'px';
      lineSelectionDiv.style.width = (INCLUSIVEendColumn - startColumn) * EDITOR_characterWidth + 'px';
    } else {
      // start line
      lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
      lineSelectionDiv.className = 'EDITOR_selection';
      lineSelectionDiv.style.left = startColumn * EDITOR_characterWidth + 'px';
      lineSelectionDiv.style.top = EDITOR_int_fields[2] * startLine + 'px';
      let line = EDITOR_getLineBoundaryPositions(startLine);
      let lineLength = line.end - line.start;
      lineSelectionDiv.style.width = (lineLength + 1 - startColumn) * EDITOR_characterWidth + 'px';

      // between lines
      for (var lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
        lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
        lineSelectionDiv.className = 'EDITOR_selection';
        lineSelectionDiv.style.left = '0';
        lineSelectionDiv.style.top = EDITOR_int_fields[2] * lineI + 'px';
        let line = EDITOR_getLineBoundaryPositions(lineI);
        let lineLength = line.end - line.start;
        lineSelectionDiv.style.width = (lineLength + 1) * EDITOR_characterWidth + 'px';
      }

      // end line
      lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
      lineSelectionDiv.className = 'EDITOR_selection';
      lineSelectionDiv.style.left = '0';
      lineSelectionDiv.style.top = EDITOR_int_fields[2] * INCLUSIVEendLine + 'px';
      lineSelectionDiv.style.width = INCLUSIVEendColumn * EDITOR_characterWidth + 'px';
    }
  }
}
function EDITOR_createStyleForSelection_indentMore(cursor) {
  let textSelectionDiv;
  if (cursor.selectionDivExists) {
    for (var i = 0; i < EDITOR_baseElement.children[4].children[0].children.length; i++) {
      if (EDITOR_baseElement.children[4].children[0].children[i].id === cursor.htmlId) {
        textSelectionDiv = EDITOR_baseElement.children[4].children[0].children[i];
        break;
      }
    }
  } else {
    // TODO: Silent error confusing bad idea
    return;
  }
  let extraWidth = 4 * EDITOR_characterWidth;
  for (let i = 0; i < textSelectionDiv.children.length; i++) {
    let lineSelectionDiv = textSelectionDiv.children[i];
    let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
    widthNumberValue += extraWidth;
    lineSelectionDiv.style.width = widthNumberValue + 'px';
  }
  cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
  cursor.DRAWN_selectionEnd = cursor.selectionEnd;
}
function EDITOR_getLastValidIndexColumn(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return EDITOR_readLineEndPositionList(indexLine) - 0;
    } else {
      return EDITOR_readLineEndPositionList(indexLine) - (EDITOR_readLineEndPositionList(indexLine - 1) + 1);
    }
  }
  return 0;
}

/**
 * result.start is the position of the first character on that line.
 * 
 * result.end is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * NOTE: In performance critical sections this code is explicitly inlined and modified to be as performant as it seemingly can get for that specific section of code.
 * 
 * @returns an object with properties 'start' inclusive, 'end' exclusive
 */
function EDITOR_getLineBoundaryPositions(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return {
        start: 0,
        end: EDITOR_readLineEndPositionList(indexLine) - 0
      };
    } else {
      return {
        start: EDITOR_readLineEndPositionList(indexLine - 1) + 1,
        end: EDITOR_readLineEndPositionList(indexLine)
      };
    }
  }
  return {
    start: 0,
    end: 0
  };
}
function EDITOR_getLineStart_pos(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return 0;
    } else {
      return EDITOR_readLineEndPositionList(indexLine - 1) + 1;
    }
  }
  return 0;
}
function EDITOR_getLineEnd_pos(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return EDITOR_readLineEndPositionList(indexLine) - 0;
    } else {
      return EDITOR_readLineEndPositionList(indexLine);
    }
  }
  return 0;
}

/**
 * result.start is the position of the first character on that line.
 * 
 * result.end is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * @returns an object with properties 'start' inclusive, 'end' exclusive
 */
function EDITOR_getLineBoundaryPositions_raw(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return {
        start: 0,
        end: EDITOR_lineEndPositionList.data[indexLine] - 0
      };
    } else {
      return {
        start: EDITOR_lineEndPositionList.data[indexLine - 1] + 1,
        end: EDITOR_lineEndPositionList.data[indexLine]
      };
    }
  }
  return {
    start: 0,
    end: 0
  };
}
function EDITOR_getLineStart_pos_raw(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return 0;
    } else {
      return EDITOR_lineEndPositionList.data[indexLine - 1] + 1;
    }
  }
  return 0;
}
function EDITOR_getLineEnd_pos_raw(indexLine) {
  if (indexLine < EDITOR_lineEndPositionList.count) {
    if (indexLine === 0) {
      return EDITOR_lineEndPositionList.data[indexLine] - 0;
    } else {
      return EDITOR_lineEndPositionList.data[indexLine];
    }
  }
  return 0;
}
function EDITOR_measureLineHeightAndCharacterWidth() {
  let measureElement = document.createElement('div');
  measureElement.style.width = "fit-content";
  EDITOR_baseElement.children[4].children[2].appendChild(measureElement);
  let sampleTextBuilder = [];
  for (var i = 0; i < 11; i++) {
    // This is quite silly.
    // The font is intended to be monospace.
    //
    // Given the comment about monospace, all in all what this method does is:
    // 36 characters repeated 11 times
    //
    // I've in the past found this to give the most accurate character width.
    //
    // I don't want to store this string as one massive string that is 11 times the size,
    // because then it has to sit (presumably) as an interned string or in some data section
    // all app long.
    //
    // Since this is doing a "builder" and monospace, it might be similar to just append the number '0' for (36 * 11) times
    //
    // FURTHERMORE: I need to revisit calcuating the character width, this is somewhat of an early
    // way I found to get it, perhaps it isn't quite so involved.
    //
    sampleTextBuilder.push("abcdefghijklmnopqrstuvwxyz0123456789");
  }
  measureElement.innerHTML = sampleTextBuilder.join("");

  // ... this HAS a decimal part, but it is sensible for it to have one.
  EDITOR_characterWidth = measureElement.offsetWidth / (36 * 11);
  // TODO: This is currently a whole number but regardless, it presumably could end up having a decimal part.
  EDITOR_int_fields[2] = Math.ceil(measureElement.offsetHeight);
  const root = document.documentElement;
  const computedStyles = window.getComputedStyle(root);
  let teLineHeight = EDITOR_int_fields[2] + 'px';
  let propertyName = '--EDITOR-line-height';
  if (computedStyles.getPropertyValue(propertyName) !== teLineHeight) {
    // avoid layout with if statement
    root.style.setProperty(propertyName, teLineHeight);
  }
  EDITOR_baseElement.children[4].children[2].removeChild(measureElement);
}

// TODO: I believe this throttling logic can still be improved upon... I feel like there are too many functions being defined but I'm not sure. I'd prefer 1 less function be involved per throttle case.
function EDITOR_onMouseMove_WRAPIT(event) {
  if (event.buttons & 1 && EDITOR_byte_fields[4]) {
    EDITOR_onMouseMove_event = event;
    if (!EDITOR_onMouseMove_timer) {
      if (true /*options.leading*/) {
        EDITOR_onMouseMove(event);
      }
      EDITOR_onMouseMove_timer = setTimeout(EDITOR_onMouseMove_timeoutFunc, 90);
    }
  } else {
    EDITOR_byte_fields[4] = false;
  }
}
function EDITOR_onMouseMove_timeoutFunc() {
  if (/*trailing && lastArgs*/EDITOR_onMouseMove_event) {
    EDITOR_onMouseMove(EDITOR_onMouseMove_event);
    EDITOR_onMouseMove_event = null;
    EDITOR_onMouseMove_timer = setTimeout(EDITOR_onMouseMove_timeoutFunc, 90);
  } else {
    EDITOR_onMouseMove_timer = null;
  }
}
function EDITOR_onMouseMove(event) {
  if (EDITOR_byte_fields[1]) {
    return;
  }
  let rX = event.clientX - EDITOR_int_fields[28] - EDITOR_int_fields[7] + EDITOR_baseElement.scrollLeft;
  let rY = event.clientY - EDITOR_int_fields[29] + EDITOR_baseElement.scrollTop;
  let indexColumn = Math.round(rX / EDITOR_characterWidth);
  let indexLine = Math.floor(rY / EDITOR_int_fields[2]);
  if (indexColumn < 0) {
    indexColumn = 0;
  }
  if (indexLine < 0) {
    indexLine = 0;
  }
  if (indexLine >= EDITOR_lineEndPositionList.count) {
    indexLine = EDITOR_lineEndPositionList.count - 1;
  }
  let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(indexLine);
  if (indexColumn > lastValidIndexColumn) {
    indexColumn = lastValidIndexColumn;
  }
  let cursor = EDITOR_primaryCursor;
  cursor.indexLine = indexLine;
  cursor.indexColumn = indexColumn;
  EDITOR_drawCursor(cursor);
  if (EDITOR_byte_fields[0] === 3) {
    EDITOR_onMouseMoveDetailRankThree(event, indexLine, indexColumn);
  } else if (EDITOR_byte_fields[0] === 2) {
    EDITOR_onMouseMoveDetailRankTwo(event, indexLine, indexColumn);
  } else if (EDITOR_byte_fields[0] === 1) {
    EDITOR_onMouseMoveDetailRankOne(event, indexLine, indexColumn);
  }
}
function EDITOR_onMouseMoveDetailRankOne(event, lineIndexClicked, columnIndexClicked) {
  let cursor = EDITOR_primaryCursor;
  cursor.indexLine = lineIndexClicked;
  cursor.indexColumn = columnIndexClicked;
  cursor.selectionEnd = EDITOR_getPositionIndex(cursor);
  EDITOR_drawCursor(cursor);
}
function getCharacter(positionIndex) {
  // in this getCharacter function, you'd actually already know the total shift if you just looped forwards.
  // Also this currently is EXTREMELY unoptimized given that it resets the totalShift each time it gets invoked rather than remembering the previous result.

  // maybe when hitting ArrowRight you'd want to finalize the edits?
  // because if you have multicursor with two cursors on the same line
  // you type some letters
  // then ctrl arrow right
  // how would this interact with the line end positions?
  //
  // I think if it were something like this, that it'd relate to whether the user moved they're cursor outisde the range of that cursor's pending "gap buffer" insertion text.
  //
  // additionally this function feels "random access", you need to consider a consecutive approach where you accumulate this state.
  // and that's what the plan was... but it doesn't quite feel like it would go here. Or that there'd be a second function in which you agree to using contextual information to determine the result much faster.

  // Cursors overlapping missed cases:
  // =================================
  // two cursors same line hit home
  // two cursors same line hit end

  // this only gets 1 character why is it using the ..._decode_... functions.

  let totalShift = 0;
  // If you need to determine the text without finalizing an edit, you DO have to loop forwards right?
  for (var i = 0; i < EDITOR_cursorList.length; i++) {
    let cursor = EDITOR_cursorList[i];
    switch (cursor.editKind) {
      case 1:
        if (positionIndex >= cursor.editPosition & positionIndex < cursor.editPosition + cursor.editLength) {
          // TODO: I hear fromCharCode is faster than 'String.fromCodePoint(...)' thus I'm seeing if it is sufficient for my current personal usage...
          // ...long term it presumably fails for characters that I don't tend to type, but until then this is working so I'll just use fromCharCode.
          //
          // TODO: This takes a spread/array; if I give it a single byte does it allocate a length of 1 array every invocation?
          return String.fromCharCode(cursor.gapBuffer[positionIndex - cursor.editPosition]);
        } else if (cursor.editPosition <= positionIndex) {
          totalShift += cursor.editLength;
        }
        break;
      case 2:
      case 3:
      case 4:
        totalShift -= cursor.editLength;
        break;
    }
  }
  // TODO: I hear fromCharCode is faster than 'String.fromCodePoint(...)' thus I'm seeing if it is sufficient for my current personal usage...
  // ...long term it presumably fails for characters that I don't tend to type, but until then this is working so I'll just use fromCharCode.
  //
  // TODO: This takes a spread/array; if I give it a single byte does it allocate a length of 1 array every invocation?
  return String.fromCharCode(EDITOR_textByteList.bytes[positionIndex - totalShift]);
}

/**
 * 'positionIndex' is a calculated value that is commonly calculated.
 * It tends to be the case that you already are using a variable to store the positionIndex.
 * Thus providing that positionIndex is ideal.
 * 
 * @param {*} cursor 
 * @param {*} positionIndex 
 */
function EDITOR_getCharacterPrevious(indexColumn, positionIndex) {
  // TODO: Make a 'getCharacter(...) method so the gap buffer logic can be in one location.
  if (indexColumn !== 0) {
    return getCharacter(positionIndex - 1);
  } else {
    // TODO: I'm pretty sure this was supposed to say '\0' but it happens to "work" due to them both being 0.
    return 0;
  }
}

/**
  * 'positionIndex' is a calculated value that is commonly calculated.
 * It tends to be the case that you already are using a variable to store the positionIndex.
 * Thus providing that positionIndex is ideal.
 * 
 * @param {*} indexColumn 
 * @param {*} positionIndex 
 * @param {*} line 
 */
function EDITOR_getCharacterCurrent(indexColumn, positionIndex, lineEnd) {
  if (indexColumn < lineEnd) {
    return getCharacter(positionIndex);
  } else {
    // TODO: I'm pretty sure this was supposed to say '\0' but it happens to "work" due to them both being 0.
    return 0;
  }
}
function EDITOR_getCharacterPrevious_KIND(indexColumn, positionIndex) {
  if (indexColumn !== 0) {
    return EDITOR_getCharacterKind(EDITOR_getCharacterPrevious(indexColumn, positionIndex));
  } else {
    return 0;
  }
}
function EDITOR_getCharacterCurrent_KIND(indexColumn, positionIndex, lineEnd) {
  if (indexColumn < lineEnd) {
    return EDITOR_getCharacterKind(EDITOR_getCharacterCurrent(indexColumn, positionIndex, lineEnd));
  } else {
    return 0;
  }
}
function EDITOR_onMouseMoveDetailRankTwo(event, lineIndexClicked, columnIndexClicked) {
  let nextPositionIndex = EDITOR_getPositionIndex_Overload(lineIndexClicked, columnIndexClicked);
  let cursor = EDITOR_primaryCursor;
  if (nextPositionIndex <= EDITOR_int_fields[3]) {
    if (cursor.selectionAnchor < cursor.selectionEnd) {
      cursor.selectionAnchor = EDITOR_int_fields[4];
    }
    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;
    let positionIndex = nextPositionIndex;
    cursor.selectionEnd = positionIndex;
    if (nextPositionIndex < EDITOR_int_fields[3]) {
      let goalCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, positionIndex, EDITOR_getLineEnd_pos(cursor.indexLine));
      let leftWasFound = false;
      let tempPositionIndex = positionIndex;
      while (cursor.indexColumn > 0) {
        let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, tempPositionIndex);
        if (leftCharacterKind !== goalCharacterKind) {
          cursor.selectionEnd = tempPositionIndex;
          leftWasFound = true;
          break;
        }
        tempPositionIndex--;
        cursor.indexColumn--;
      }
      if (!leftWasFound) {
        cursor.selectionEnd = tempPositionIndex;
      }
    }
    EDITOR_drawCursor(cursor);
  } else {
    if (cursor.selectionAnchor > cursor.selectionEnd) {
      cursor.selectionAnchor = EDITOR_int_fields[3];
    }
    if (nextPositionIndex >= EDITOR_int_fields[4]) {
      cursor.indexLine = lineIndexClicked;
      cursor.indexColumn = columnIndexClicked;
      let positionIndex = nextPositionIndex;
      cursor.selectionEnd = positionIndex;
      let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, positionIndex);
      let goalCharacterKind = leftCharacterKind;
      let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
      lineLength = line.end - line.start;
      let rightWasFound = false;
      let tempPositionIndex = positionIndex;
      while (cursor.indexColumn < lineLength) {
        let rightCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, tempPositionIndex, line.end);
        if (rightCharacterKind !== goalCharacterKind) {
          cursor.selectionEnd = tempPositionIndex;
          rightWasFound = true;
          break;
        }
        tempPositionIndex++;
        cursor.indexColumn++;
      }
      if (!rightWasFound) {
        // end of line
        cursor.selectionEnd = tempPositionIndex;
      }
    } else {
      let largeLineAndColumnIndices = EDITOR_getLineAndColumnIndices(EDITOR_int_fields[4]);
      cursor.indexLine = largeLineAndColumnIndices.indexLine;
      cursor.indexColumn = largeLineAndColumnIndices.indexColumn;
      cursor.selectionEnd = EDITOR_int_fields[4];
    }
    EDITOR_drawCursor(cursor);
  }
}
function EDITOR_onMouseMoveDetailRankThree(event, lineIndexClicked, columnIndexClicked) {
  let cursor = EDITOR_primaryCursor;
  if (lineIndexClicked === EDITOR_int_fields[5]) {
    if (cursor.positionIndex !== EDITOR_int_fields[3]) {
      let smallLineAndColumnPositionIndices = EDITOR_getLineAndColumnIndices(EDITOR_int_fields[3]);
      cursor.indexLine = smallLineAndColumnPositionIndices.indexLine;
      cursor.indexColumn = smallLineAndColumnPositionIndices.indexColumn;
    }
    if (cursor.selectionEnd !== EDITOR_int_fields[3]) {
      cursor.selectionEnd = EDITOR_int_fields[3];
    }
    if (cursor.selectionAnchor !== EDITOR_int_fields[4]) {
      cursor.selectionAnchor = EDITOR_int_fields[4];
    }
    EDITOR_drawCursor(cursor);
  } else if (lineIndexClicked < EDITOR_int_fields[5]) {
    if (cursor.selectionAnchor < cursor.selectionEnd) {
      let smallLineAndColumnPositionIndices = EDITOR_getLineAndColumnIndices(EDITOR_int_fields[3]);
      cursor.indexLine = smallLineAndColumnPositionIndices.indexLine;
      cursor.indexColumn = smallLineAndColumnPositionIndices.indexColumn;
      cursor.selectionEnd = EDITOR_int_fields[3];
      EDITOR_drawCursor(cursor);
    }
    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = 0;
    cursor.selectionEnd = EDITOR_getPositionIndex_Overload(lineIndexClicked, 0);
    EDITOR_drawCursor(cursor);
  } else if (lineIndexClicked > EDITOR_int_fields[5]) {
    if (cursor.selectionAnchor !== EDITOR_int_fields[3]) {
      cursor.selectionAnchor = EDITOR_int_fields[3];
    }
    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;
    let positionIndex = EDITOR_getPositionIndex_Overload(lineIndexClicked, columnIndexClicked);

    // move to end of line...
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    let lineLength = line.end - line.start;
    positionIndex += lineLength - cursor.indexColumn;
    if (cursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
      cursor.indexColumn = lineLength;
      cursor.selectionEnd = positionIndex;
    } else {
      // wrap to the next line
      cursor.indexLine++;
      cursor.indexColumn = 0;
      positionIndex++;
      cursor.selectionEnd = positionIndex;
    }
    EDITOR_drawCursor(cursor);
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_getPositionIndex(cursor) {
  return EDITOR_getLineStart_pos(cursor.indexLine) + cursor.indexColumn;
}
function EDITOR_getPositionIndex_Overload(indexLine, indexColumn) {
  return EDITOR_getLineStart_pos(indexLine) + indexColumn;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_getPositionIndex_raw(cursor) {
  return EDITOR_getLineStart_pos_raw(cursor.indexLine) + cursor.indexColumn;
}
function EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked) {
  let cursor = EDITOR_primaryCursor;
  let selectionPlusContextMenuCase = event.button === 2 && cursor.hasSelection();
  if (event.shiftKey && !selectionPlusContextMenuCase) {
    if (!cursor.hasSelection()) {
      cursor.selectionAnchor = EDITOR_getPositionIndex(cursor);
    }
  }
  if (!selectionPlusContextMenuCase) {
    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;
    cursor.STORED_indexColumn = cursor.indexColumn;
    cursor.selectionEnd = EDITOR_getPositionIndex(cursor);
    if (!event.shiftKey) {
      cursor.selectionAnchor = cursor.selectionEnd;
    }
  }
  EDITOR_drawCursor(cursor);
}
function EDITOR_onMouseDownDetailRankTwo(event, lineIndexClicked, columnIndexClicked) {
  if (event.shiftKey) {
    EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked);
    return;
  }
  let cursor = EDITOR_primaryCursor;
  cursor.indexLine = lineIndexClicked;
  cursor.indexColumn = columnIndexClicked;
  let positionIndex = EDITOR_getPositionIndex(cursor);
  let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
  let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, positionIndex);
  let rightCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, positionIndex, line.end);
  if (leftCharacterKind === rightCharacterKind) {
    let goalCharacterKind = rightCharacterKind;
    let tempIndexColumn = cursor.indexColumn;
    let tempPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
    while (tempIndexColumn > 0) {
      tempIndexColumn--;
      tempPositionIndex--;
      leftCharacterKind = EDITOR_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
      if (leftCharacterKind !== goalCharacterKind) {
        cursor.selectionAnchor = tempPositionIndex;
        break;
      }
    }
    let lineLength = line.end - line.start;
    let rightWasFound = false;
    tempIndexColumn = cursor.indexColumn;
    tempPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
    while (tempIndexColumn < lineLength) {
      tempIndexColumn++;
      tempPositionIndex++;
      rightCharacterKind = EDITOR_getCharacterCurrent_KIND(tempIndexColumn, tempPositionIndex, line.end);
      if (rightCharacterKind !== goalCharacterKind) {
        cursor.indexColumn = tempIndexColumn;
        cursor.selectionEnd = tempPositionIndex;
        rightWasFound = true;
        break;
      }
    }
    if (!rightWasFound) {
      // end of line
      cursor.indexColumn = tempIndexColumn;
      cursor.selectionEnd = tempPositionIndex;
    }
    EDITOR_drawCursor(cursor);
  } else if (leftCharacterKind > rightCharacterKind) {
    let goalCharacterKind = leftCharacterKind;
    let tempIndexColumn = cursor.indexColumn;
    let originalPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
    let tempPositionIndex = originalPositionIndex;
    while (cursor.indexColumn > 0) {
      tempIndexColumn--;
      tempPositionIndex--;
      leftCharacterKind = EDITOR_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
      if (leftCharacterKind !== goalCharacterKind) {
        cursor.selectionAnchor = tempPositionIndex;
        break;
      }
    }
    cursor.selectionEnd = originalPositionIndex;
    EDITOR_drawCursor(cursor);
  } else {
    let goalCharacterKind = rightCharacterKind;
    let positionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, cursor.indexColumn);
    cursor.selectionAnchor = positionIndex;
    let lineLength = line.end - line.start;
    let rightWasFound = false;
    while (cursor.indexColumn < lineLength) {
      cursor.indexColumn++;
      positionIndex++;
      rightCharacterKind = EDITOR_getCharacterCurrent(cursor.indexColumn, positionIndex, line.end);
      if (rightCharacterKind !== goalCharacterKind) {
        cursor.selectionEnd = positionIndex;
        rightWasFound = true;
        break;
      }
    }
    if (!rightWasFound) {
      // end of line
      cursor.selectionEnd = positionIndex;
    }
    EDITOR_drawCursor(cursor);
  }
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    EDITOR_int_fields[3] = cursor.selectionAnchor;
    EDITOR_int_fields[4] = cursor.selectionEnd;
  } else {
    EDITOR_int_fields[3] = cursor.selectionEnd;
    EDITOR_int_fields[4] = cursor.selectionAnchor;
  }
}
function EDITOR_onMouseDownDetailRankThree(event, lineIndexClicked, columnIndexClicked) {
  if (event.shiftKey) {
    EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked);
    return;
  }
  let cursor = EDITOR_primaryCursor;
  cursor.indexLine = lineIndexClicked;
  cursor.indexColumn = columnIndexClicked;
  cursor.selectionAnchor = EDITOR_getPositionIndex_Overload(cursor.indexLine, 0);
  EDITOR_int_fields[5] = cursor.indexLine;
  if (cursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    cursor.selectionEnd = line.end;
    EDITOR_drawCursor(cursor);
  } else {
    cursor.indexLine++;
    cursor.indexColumn = 0;
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    cursor.selectionEnd = line.start;
    EDITOR_drawCursor(cursor);
  }
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    EDITOR_int_fields[3] = cursor.selectionAnchor;
    EDITOR_int_fields[4] = cursor.selectionEnd;
  } else {
    EDITOR_int_fields[3] = cursor.selectionEnd;
    EDITOR_int_fields[4] = cursor.selectionAnchor;
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_insertGapBufferSpan(cursor) {
  let w = walkLineUntilColumnIndex(cursor);
  if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
    cursor.gapBufferWriteToSpanElement = null;
    cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
    return;
  }
  if (w.indexColumn_Goal == 0) {
    // TODO: Ensure 'w.div.children[0]' is equal to the 'w.span' and then change this line to use 'w.span'
    cursor.gapBufferWriteToSpanElement = w.span;
    cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
  } else {
    cursor.gapBufferWriteToSpanElement = w.div.children[w.indexSpan];
    if (w.indexColumn_Goal === w.indexColumn_Sum + cursor.gapBufferWriteToSpanElement.textContent.length) {
      cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = cursor.gapBufferWriteToSpanElement.textContent.length;
    } else {
      cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = w.indexColumn_SpanTextContentRelative;
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} editKind 
 * @param {*} editPosition 
 * @param {*} editLength 
 */
function EDITOR_startEdit(cursor, editKind, editPosition, editLength) {
  cursor.editKind = editKind;
  cursor.editPosition = editPosition;
  cursor.editIndexLine = cursor.indexLine;
  cursor.editIndexColumn = cursor.indexColumn;
  cursor.editLength = editLength;
  switch (editKind) {
    case 1:
      EDITOR_insertGapBufferSpan(cursor);
      break;
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} indexCursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_insert(cursor, indexCursor) {
  return cursor.editKind != 1 || cursor.indexLine !== cursor.editIndexLine || cursor.indexColumn !== cursor.editIndexColumn + cursor.editLength || cursor.editLength >= EDITOR_Cursor.GAP_BUFFER_CAPACITY || cursor.hasSelection();
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_backspace(cursor) {
  // TODO: Exception during finalize softlocks the editor because you can't even clear to reset the state: 'Uncaught (in promise) Error: removeAt(...): index > this.count'

  return cursor.editKind != 3 || cursor.indexLine !== cursor.editIndexLine || cursor.indexColumn !== cursor.editIndexColumn || cursor.hasSelection();
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_delete(cursor) {
  return cursor.editKind != 2 || cursor.indexLine !== cursor.editIndexLine || cursor.indexColumn !== cursor.editIndexColumn || cursor.hasSelection();
}

/**
 * javascript is single threaded, if this does end up working, don't repeat this in other languages, runtimes, etc... without care.
 * Also I looked at all the async logic and believe everything is in proper timing. This pattern perhaps would break if an await where added somewhere in a critical section?
 * It's actually extremely scuffed lmao. I'm counting on the get_ticket_didChangeTextDocumentNotificationPromise() not being captured on lambda "creation"?
 * but instead inside the lambda when I ask for it it gets the value.
 * This could make sense for references. It "should" be fine because maybe I'm actually capturing 'this' and then accessing the variable from there?
 * could 'this.get_ticket_didChangeTextDocumentNotificationPromise()' result in different lambda variablel capturing such and such?
 * I should probably make sure it works but I'm not there yet.
 */
async function EDITOR_didChangeTextDocumentNotification(absolutePath, version, startLine, startCharacter, endLine, endCharacter, text, ticket) {
  await window.myAPI.didChangeTextDocumentNotification(absolutePath, version, startLine, startCharacter, endLine, endCharacter, text);
  if (EDITOR_int_fields[10] === ticket) {
    didChangeTextDocumentNotificationPromise = null;
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_finalizeEdit(cursor) {
  /**
   * Later code needs to know the line index that the removal occurred on.
   * In a naive approach, presume every edit only spans a single line.
   * Then reversing backwards gets you the first line index that "fits" the edit and thus the line index the edit occurred on.
   * 
   * If for whatever reason the first time around this loop fails, then you never decremented so you wouldn't increment to restore
   * the iteration variable to the previous loop's state.
   */
  let lineIndex_editOccurredOn = -1;
  switch (cursor.editKind) {
    case 1:
      {
        for (let i = EDITOR_lineEndPositionList.count - 1; i >= 0; i--) {
          if (cursor.editPosition <= EDITOR_lineEndPositionList.data[i]) {
            EDITOR_lineEndPositionList.data[i] += cursor.editLength;
          } else {
            if (i === EDITOR_lineEndPositionList.count - 1) {
              lineIndex_editOccurredOn = i;
            } else {
              lineIndex_editOccurredOn = i + 1;
            }
            break;
          }
        }
        for (var i = 0; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
          EDITOR_trackedSyntaxList.getElementAt(i);
          if (cursor.editPosition <= EDITOR_int_fields[30]) {
            EDITOR_trackedSyntaxList.setStart(i, EDITOR_int_fields[30] + cursor.editLength);
          } else if (EDITOR_pooledTrackedSyntax_trackedSyntaxKind === TrackedSyntaxKind.Comment && cursor.editPosition === EDITOR_int_fields[30] + 1) {
            // TODO: Insertion of '*' probably shouldn't remove.
            EDITOR_trackedSyntaxList.removeAt(i, 1);
          } else if (cursor.editPosition > EDITOR_int_fields[30] && cursor.editPosition < EDITOR_int_fields[30] + EDITOR_int_fields[31]) {
            EDITOR_trackedSyntaxList.setLength(i, EDITOR_int_fields[31] + cursor.editLength);
          }
        }
        EDITOR_textByteList.insertBytes(cursor.editPosition, cursor.gapBuffer, /*offset*/0, /*length*/cursor.gapBufferCount);
        EDITOR_int_fields[10] = EDITOR_int_fields[10] + 1;
        let ticket = EDITOR_int_fields[10];
        let textSourceIdentifier = EDITOR_FORMATTED_textSourceIdentifier;
        let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(cursor.editPosition);
        // TODO: Account for any '\0\0\0\t' that exist on the line
        let text = EDITOR_decoder.decode(cursor.gapBuffer.subarray(0, cursor.gapBufferCount));
        EDITOR_int_fields[11] = EDITOR_int_fields[11] + 1;
        let version = EDITOR_int_fields[11];
        if (didChangeTextDocumentNotificationPromise) {
          didChangeTextDocumentNotificationPromise = didChangeTextDocumentNotificationPromise.then(async () => {
            await EDITOR_didChangeTextDocumentNotification(textSourceIdentifier, version, lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn, lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn, text, ticket);
          });
        } else {
          didChangeTextDocumentNotificationPromise = EDITOR_didChangeTextDocumentNotification(textSourceIdentifier, version, lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn, lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn, text, ticket);
        }
        if (lineIndex_editOccurredOn === EDITOR_int_fields[21]) {
          EDITOR_int_fields[22] = EDITOR_int_fields[22] + cursor.editLength;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        break;
      }
    case 8:
      {
        // TODO: A notification needs to sent to the LSP here
        // TODO: Update the tracked syntax list here... the enter key event actually is invoking 'EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength'...

        // I don't know what to do so I'm starting by making this enum,
        // then switch over it,
        // the code already was written as conditional branches and this enum represents each branch.
        // 
        // Now I can move the commented out code per branch to this respective switch and see if it gets me anywhere.

        switch (cursor.enterKeyEventKind) {
          case 1:
            if (cursor.cached_indentation_byteList) {
              // TODO: Enter key should instead store the position of the indentation, then you can write the byte array that contains all of the "text"...
              // ...you can insert the span that has the indentation into the same array again.
              EDITOR_textByteList.insertBytes(cursor.editPosition, cursor.cached_indentation_byteList.bytes, /*offset*/0, cursor.cached_indentation_byteList.count);
            }
            EDITOR_textByteList.insert(cursor.editPosition + cursor.cached_indentation_byteList.count, ASCII_LINE_FEED);
            for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
              EDITOR_lineEndPositionList.data[i] += cursor.editLength;
            }
            if (cursor.editIndexLine <= EDITOR_int_fields[21]) {
              EDITOR_int_fields[21] = EDITOR_int_fields[21] + 1;
            }
            EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition + cursor.cached_indentation_byteList.count);
            break;
          case 2:
            EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);
            if (cursor.cached_indentation_byteList) {
              EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/0, cursor.cached_indentation_byteList.count);
            }
            for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
              EDITOR_lineEndPositionList.data[i] += cursor.editLength;
            }
            if (cursor.editIndexLine <= EDITOR_int_fields[21]) {
              EDITOR_int_fields[21] = EDITOR_int_fields[21] + 1;
            }
            EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
            break;
          case 3:
            EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);
            if (cursor.cached_indentation_byteList) {
              EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/0, cursor.cached_indentation_byteList.count);
            }
            for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
              EDITOR_lineEndPositionList.data[i] += cursor.editLength;
            }
            if (cursor.editIndexLine <= EDITOR_int_fields[21]) {
              EDITOR_int_fields[21] = EDITOR_int_fields[21] + 1;
            }
            EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
            break;
          case 4:
            EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);
            if (cursor.cached_indentation_byteList) {
              EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/0, cursor.cached_indentation_byteList.count);
            }
            for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
              EDITOR_lineEndPositionList.data[i] += cursor.editLength;
            }
            if (cursor.editIndexLine <= EDITOR_int_fields[21]) {
              EDITOR_int_fields[21] = EDITOR_int_fields[21] + 1;
            }
            EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
            break;
        }
        if (!cursor.enterKeyEventKind || cursor.enterKeyEventKind === 0) {
          throw new Error('if (!enterKeyEventKind...)');
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        return;
      }
    case 5:
      {
        EDITOR_textByteList.insertBytes(cursor.editPosition, EDITOR_on_tab_bytes, /*offset*/0, /*length*/4);
        for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
          EDITOR_lineEndPositionList.data[i] += 4;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        return;
      }
    case 6:
      {
        let ORIGINAL_incrementBy = EDITOR_int_fields[25];
        let incrementBy = EDITOR_int_fields[25];
        EDITOR_int_fields[25] = 0;
        let startingIndex = EDITOR_int_fields[27];
        EDITOR_int_fields[27] = 0;
        let SMALL_lineAndColumnIndices_indexLine = EDITOR_int_fields[26];
        EDITOR_int_fields[26] = 0;
        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
          let linePos = EDITOR_getLineBoundaryPositions(lineI);

          // # Insert the text on the respective line.
          EDITOR_textByteList.insertBytes(linePos.start, EDITOR_on_tab_bytes, 0 /*offset*/, 4 /*length*/);

          // # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
          EDITOR_lineEndPositionList.data[lineI] += incrementBy;

          // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
          //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
          //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
          incrementBy -= 4;
        }

        // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
        for (var lineI = startingIndex + 1; lineI < EDITOR_lineEndPositionList.count; lineI++) {
          EDITOR_lineEndPositionList.data[lineI] += ORIGINAL_incrementBy;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        return;
      }
    case 7:
      {
        let ORIGINAL_decrementBy = EDITOR_int_fields[25];
        let decrementBy = EDITOR_int_fields[25];
        EDITOR_int_fields[25] = 0;
        let startingIndex = EDITOR_int_fields[27];
        EDITOR_int_fields[27] = 0;
        let SMALL_lineAndColumnIndices_indexLine = EDITOR_int_fields[26];
        EDITOR_int_fields[26] = 0;
        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
          let innerRemoveCount = 0;
          let linePos = EDITOR_getLineBoundaryPositions(lineI);
          let line = linePos;
          let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
          let upperLimitIndexColumn;
          if (lastValidIndexColumn > 4) {
            upperLimitIndexColumn = 4;
          } else {
            upperLimitIndexColumn = lastValidIndexColumn;
          }
          let seenSpace = false;
          outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
            let c = getCharacter(line.start + i);
            switch (c) {
              case ' ':
                seenSpace = true;
                innerRemoveCount++;
                break;
              case '\t':
                if (!seenSpace) {
                  innerRemoveCount += 4;
                }
                break outer;
              default:
                break outer;
            }
          }
          EDITOR_textByteList.removeAt(linePos.start, innerRemoveCount);
          EDITOR_lineEndPositionList.data[lineI] -= decrementBy;
          decrementBy -= innerRemoveCount;
        }
        for (var lineI = startingIndex + 1; lineI < EDITOR_lineEndPositionList.count; lineI++) {
          EDITOR_lineEndPositionList.data[lineI] -= ORIGINAL_decrementBy;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        break;
      }
    case 9:
      {
        let content = cursor.EDITOR_paste_clipboardContent;
        cursor.EDITOR_paste_clipboardContent = null;
        let linesInsertedCount = 0;
        let insertionLength = 0;
        for (var sourceI = 0; sourceI < content.length; sourceI++) {
          switch (content[sourceI]) {
            case '\t':
              EDITOR_textByteList.insertBytes(cursor.editPosition + insertionLength, EDITOR_tab_tabsbytes, /*offset*/0, /*length*/4);
              insertionLength += 4;
              break;
            case '\n':
              EDITOR_textByteList.insert(cursor.editPosition + insertionLength, ASCII_LINE_FEED);
              EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
              insertionLength++;
              linesInsertedCount++;
              break;
            case '\r':
              if (sourceI < content.length - 1 && content[sourceI + 1] === '\n') {
                sourceI++;
              }
              EDITOR_textByteList.insert(cursor.editPosition + insertionLength, ASCII_LINE_FEED);
              EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
              insertionLength++;
              linesInsertedCount++;
              break;
            default:
              EDITOR_textByteList.insert(cursor.editPosition + insertionLength, content.charCodeAt(sourceI));
              insertionLength++;
              break;
          }
        }
        for (var i = cursor.editIndexLine + linesInsertedCount; i < EDITOR_lineEndPositionList.count; i++) {
          EDITOR_lineEndPositionList.data[i] += insertionLength;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        EDITOR_lineEndPositionList_PENDING.clear();
        return;
      }
    case 10:
      {
        let small = cursor.EDITOR_duplicate_small;
        let length = cursor.EDITOR_duplicate_length;
        cursor.EDITOR_duplicate_small = 0;
        cursor.EDITOR_duplicate_length = 0;
        let linesInsertedCount = 0;
        let insertionLength = 0;
        EDITOR_textByteList.duplicateWithin(small, cursor.editPosition, length);

        // TODO: cursor between '\t\0\0\0' is presumed to be the concern of the editor, duplication logic presumes correctness i.e.: that if the '\t' is selected that the '\0\0\0' that come after is selected too...
        // ...and that no partial selection over those characters could ever occur.

        // Insert new lineEndPositions
        // Update the existing lineEndPositions

        //let small_lineAndColumnIndices = EDITOR_getLineAndColumnIndices_raw(small);

        // TODO: You should be able to do this much faster than looping over the selected bytes since you know the line end positions that exist and would know whether the selection will insert line endings.

        for (let offset = 0; offset < length; offset++) {
          switch (EDITOR_textByteList.bytes[small + offset]) {
            case ASCII_TAB:
              insertionLength += 4;
              break;
            case ASCII_LINE_FEED:
              EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
              insertionLength++;
              linesInsertedCount++;
              break;
            default:
              insertionLength++;
              break;
          }
        }
        for (var i = cursor.editIndexLine + linesInsertedCount; i < EDITOR_lineEndPositionList.count; i++) {
          EDITOR_lineEndPositionList.data[i] += insertionLength;
        }
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        cursor.gapBufferCount = 0;
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        EDITOR_lineEndPositionList_PENDING.clear();
        return;
      }
    case 2:
    case 3:
    case 4:
      {
        // TODO: surely u'd get this before doing the edit?
        let startLineAndColumnIndices;
        if (cursor.editKind === 4) {
          startLineAndColumnIndices = {
            indexLine: cursor.editIndexLine,
            indexColumn: cursor.editIndexColumn
          };
        } else {
          startLineAndColumnIndices = EDITOR_getLineAndColumnIndices_raw(cursor.editPosition);
        }
        let endLineAndColumnIndices;
        if (cursor.editKind === 4) {
          endLineAndColumnIndices = {
            indexLine: cursor.END_editIndexLine,
            indexColumn: cursor.END_editIndexColumn
          };
        } else {
          endLineAndColumnIndices = EDITOR_getLineAndColumnIndices_raw(cursor.editPosition + cursor.editLength);
        }
        if (cursor.editLineFeedCount > 0) {
          let count = 0;
          let lastMatchedIndexLine = 0;
          for (let i = EDITOR_lineEndPositionList_PENDING.count - 1; i >= 0; i--) {
            let lineEndPos = EDITOR_lineEndPositionList_PENDING.data[i];
            if (cursor.editPosition <= lineEndPos && cursor.editPosition + cursor.editLength > lineEndPos) {
              lastMatchedIndexLine = EDITOR_getLineAndColumnIndices_raw(lineEndPos).indexLine;
              count++;
              EDITOR_lineEndPositionList_PENDING.removeAt(i, 1);
            } else if (cursor.editPosition > lineEndPos) {
              break;
            }
          }
          if (count > 0) {
            EDITOR_lineEndPositionList.removeAt(lastMatchedIndexLine, count);
          }
        }
        for (let i = EDITOR_lineEndPositionList.count - 1; i >= 0; i--) {
          if (cursor.editPosition < EDITOR_lineEndPositionList.data[i]) {
            EDITOR_lineEndPositionList.data[i] -= cursor.editLength;
          } else {
            if (i === EDITOR_lineEndPositionList.count - 1) {
              lineIndex_editOccurredOn = i;
            } else {
              lineIndex_editOccurredOn = i + 1;
            }
            break;
          }
        }
        for (var i = EDITOR_trackedSyntaxList.count_abstract - 1; i >= 0; i--) {
          EDITOR_trackedSyntaxList.getElementAt(i);
          if (cursor.editPosition < EDITOR_int_fields[30]) {
            EDITOR_trackedSyntaxList.setStart(i, EDITOR_int_fields[30] - cursor.editLength);
          } else if (EDITOR_int_fields[30] >= cursor.editPosition && EDITOR_int_fields[30] < cursor.editPosition + cursor.editLength) {
            // TODO: This needs to remove more than 1 at a time
            EDITOR_trackedSyntaxList.removeAt(i, 1);
          } else if (EDITOR_pooledTrackedSyntax_trackedSyntaxKind === TrackedSyntaxKind.Comment && EDITOR_int_fields[30] + 1 >= cursor.editPosition && EDITOR_int_fields[30] + 1 < cursor.editPosition + cursor.editLength) {
            // TODO: You can invalidate a >1 char long by removing beyond just the first unless a character afterwards falls into place that is valid by chance

            // only multi-line-comments that span multiple lines are stored in EDITOR_trackedSyntaxList
            // with the 'TrackedSyntaxKind.Comment'

            EDITOR_trackedSyntaxList.removeAt(i, 1);
          } else if (cursor.editPosition > EDITOR_int_fields[30] && cursor.editPosition < EDITOR_int_fields[30] + EDITOR_int_fields[31]) {
            EDITOR_trackedSyntaxList.setLength(i, EDITOR_int_fields[31] - cursor.editLength);
          }
        }
        EDITOR_textByteList.removeAt(cursor.editPosition, cursor.editLength);
        EDITOR_int_fields[10] = EDITOR_int_fields[10] + 1;
        let ticket = EDITOR_int_fields[10];
        let textSourceIdentifier = EDITOR_FORMATTED_textSourceIdentifier;
        // TODO: Account for any '\0\0\0\t' that exist on the line            
        let text = '';
        EDITOR_int_fields[11] = EDITOR_int_fields[11] + 1;
        let version = EDITOR_int_fields[11];
        if (didChangeTextDocumentNotificationPromise) {
          didChangeTextDocumentNotificationPromise = didChangeTextDocumentNotificationPromise.then(async () => {
            await EDITOR_didChangeTextDocumentNotification(textSourceIdentifier, version, startLineAndColumnIndices.indexLine, startLineAndColumnIndices.indexColumn, endLineAndColumnIndices.indexLine, endLineAndColumnIndices.indexColumn, text, ticket);
          });
        } else {
          didChangeTextDocumentNotificationPromise = EDITOR_didChangeTextDocumentNotification(textSourceIdentifier, version, startLineAndColumnIndices.indexLine, startLineAndColumnIndices.indexColumn, endLineAndColumnIndices.indexLine, endLineAndColumnIndices.indexColumn, text, ticket);
        }
        if (lineIndex_editOccurredOn === EDITOR_int_fields[21]) {
          EDITOR_int_fields[22] = EDITOR_int_fields[22] - cursor.editLength;
        }
        cursor.editLineFeedCount = 0;
        cursor.editKind = 0;
        cursor.editLength = 0;
        cursor.editPosition = 0;
        cursor.editIndexLine = 0;
        cursor.editIndexColumn = 0;
        cursor.END_editIndexLine = 0;
        cursor.END_editIndexColumn = 0;
        EDITOR_lineEndPositionList_PENDING.clear();

        /*
        - Syntax is fully encompassed by the removed text  => remove
        - Syntax's open is encompassed by the removed text => invalidate
          invalidate => remove
          Are these the same thing then?
          If the open is removed then yeah
        strings are possibly more complex than the multi-line-comment because the same open as close
          TODO: If the open is > 1 characters long then an insertions among those characters is a break too.
          Nothing word based at the moment to worry about.
          TODO: When you make the syntax span a single line, you need to remove it and let the lex on the fly do it
        */

        break;
      }
  }

  // lineIndex_editOccurredOn is initialized to -1
  //
  // When gap buffer is finalized editor tries to redraw the line in order to lex it again.
  // You need to NOT do this when you are working with multiple cursors however, because it bugs everything out.
  // 
  if (EDITOR_cursorList.length === 1) {
    if (lineIndex_editOccurredOn >= 0 && lineIndex_editOccurredOn < EDITOR_lineEndPositionList.count) {
      if (EDITOR_baseElement.children[3].children[0].children.length === EDITOR_int_fields[9] && EDITOR_baseElement.children[4].children[2].children.length === EDITOR_int_fields[9]) {
        if (lineIndex_editOccurredOn >= EDITOR_int_fields[8] && lineIndex_editOccurredOn < EDITOR_int_fields[8] + EDITOR_int_fields[9]) {
          let relativeIndex = lineIndex_editOccurredOn - EDITOR_int_fields[8];
          let gutterLineElement = EDITOR_baseElement.children[3].children[0].children[relativeIndex];
          gutterLineElement.innerHTML = '';
          let textLineElement = EDITOR_baseElement.children[4].children[2].children[relativeIndex];
          textLineElement.innerHTML = '';
          EDITOR_drawLine(lineIndex_editOccurredOn, gutterLineElement, textLineElement);
        } else {
          // TODO: Consider what to do in this case.
        }
      } else {
        // TODO: Consider what to do in this case.
      }
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_preKeyboardMovementSelectionLogic(cursor, shiftKey) {
  if (shiftKey) {
    if (!cursor.hasSelection()) {
      cursor.selectionAnchor = EDITOR_getPositionIndex(cursor);
      cursor.selectionIndexAnchorLine = cursor.indexLine;
      cursor.selectionIndexAnchorColumn = cursor.indexColumn;
    }
  } else {
    if (cursor.hasSelection()) {
      cursor.selectionAnchor = cursor.selectionEnd;
      cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
      cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_postKeyboardMovementSelectionLogic(cursor, shiftKey) {
  if (shiftKey) {
    cursor.selectionEnd = EDITOR_getPositionIndex(cursor);
    cursor.selectionIndexEndLine = cursor.indexLine;
    cursor.selectionIndexEndColumn = cursor.indexColumn;
  }
}

/**
 * More accurate description for this method beyond the name:
 * Duplicate the primaryCursor, then move the primaryCursor ArrowDown.
 */
function EDITOR_createCursorLineBelow(event) {
  let indexLastCursor = EDITOR_cursorList.length - 1;
  let lastCursor = EDITOR_cursorList[indexLastCursor];
  let clone = lastCursor.clone();
  event.shiftKey = false;
  EDITOR_arrowDown(lastCursor, /*shiftKey*/false);
  EDITOR_cursorList.splice(indexLastCursor, 0, clone);
  EDITOR_baseElement.children[4].children[1].appendChild(clone.caretRow);
  EDITOR_drawCursor(clone);
  EDITOR_scrollCursorIntoView(lastCursor);
}
function EDITOR_createCursorAtNextMatchSelection(event) {
  if (!EDITOR_primaryCursor.hasSelection()) {
    return;
  }
  if (EDITOR_byte_fields[2] && !EDITOR_byte_fields[3]) {
    EDITOR_findOverlay_showSetter(false);
  }
  if (!EDITOR_byte_fields[2]) {
    EDITOR_byte_fields[3] = true;
    EDITOR_findOverlay_showSetter(true);
    EDITOR_findOverlay_doSearch();
    let small = EDITOR_primaryCursor.selectionAnchor;
    let large = EDITOR_primaryCursor.selectionEnd;
    if (EDITOR_primaryCursor.selectionAnchor > EDITOR_primaryCursor.selectionEnd) {
      small = EDITOR_primaryCursor.selectionEnd;
      large = EDITOR_primaryCursor.selectionAnchor;
    }
    let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
    if (!spanCurrent) return;
    let current = parseInt(spanCurrent.innerText, 10);
    if (current) {
      EDITOR_int_fields[0] = current;
    } else {
      EDITOR_findOverlay_showSetter(false);
      return;
    }
  }
  let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
  if (!spanCurrent) return;
  let spanTotal = document.getElementById('EDITOR_findOverlay_total');
  if (!spanTotal) return;
  let upcomingNumber = parseInt(spanCurrent.innerText, 10);
  let total = parseInt(spanTotal.innerText, 10);
  if (upcomingNumber && total) {
    upcomingNumber++;
    if (upcomingNumber > total || upcomingNumber < 1) {
      upcomingNumber = 1;
    }
    if (EDITOR_int_fields[0] === upcomingNumber) {
      return;
    }
  } else {
    spanCurrent.innerText = 'parseInt not successful?';
    return;
  }
  let prePosition = EDITOR_getPositionIndex(EDITOR_primaryCursor);

  // Avoid two cursors on the same line; wasteful double determination of primaryCursor index is occurring in this function; even a single case is likely not good long term.
  let upcomingPositionIndex = EDITOR_findOverlay_searchResultPositionList.data[upcomingNumber - 1];
  if (upcomingPositionIndex) {
    let upcomingLineAndColumnIndices = EDITOR_getLineAndColumnIndices(upcomingPositionIndex);
    let indexOfPrimaryCursor = -1;
    for (let i = 0; i < EDITOR_cursorList.length; i++) {
      if (EDITOR_cursorList[i] === EDITOR_primaryCursor) {
        indexOfPrimaryCursor = i;
        break;
      }
    }
    let isPermitted = true;
    if (upcomingLineAndColumnIndices.indexLine === EDITOR_primaryCursor.indexLine) {
      //isPermitted = false;
    }
    // if u have a pending you need finalize before allow any of this keybind
    // if u have this keybind consecutively but then do ANYTHING else you are not allowed to press this keybind again until you clear all multicursors from the origin of having used this keybind.
    // u cannot keybind this if u have multicursors active but u ARE allowed to consecutively use this keybind to make multiple multi-cursors provided the origin of the multicursors was this event and every multicursor only came from this event and no other keybinds were pressed between.
    // it sounds like u need to track the multicursor origin and then when clearing the multicursors to only be primary u need to clear the origin cause no longer multicursor
    // cause there is too much going on so like I said u need to start by limiting interactions and then expand freedom later
    if (upcomingPositionIndex < prePosition) {
      if (upcomingLineAndColumnIndices.indexLine === EDITOR_cursorList[0].indexLine) {
        //isPermitted = false;
      }
    }
    if (!isPermitted) {
      alert('EDITOR_createCursorAtNextMatchSelection: two cursors would have been on the same line, thus this action was prevented. After closing this alert the previous one or many cursors that you had will remain and you can do a multicursor edit with them, then start a new multicursor edit at this "previously a second occurrence" of your selection on a single line. 1 cursor per line is done for the initial implementation to simplify things, then will be expanded upon after to support more than 1 on same line.');
      return;
    }
  }
  let clone = EDITOR_primaryCursor.clone();
  clone.selectionAnchor = EDITOR_primaryCursor.selectionAnchor;
  clone.selectionEnd = EDITOR_primaryCursor.selectionEnd;
  EDITOR_btnNext_onclick();
  let postPosition = EDITOR_getPositionIndex(EDITOR_primaryCursor);
  if (prePosition != postPosition && postPosition != EDITOR_int_fields[0]) {
    let input = document.getElementById('EDITOR_findOverlay_input_elementId');
    if (!input || !input.value) return;
    let indexOfPrimaryCursor = -1;
    for (let i = 0; i < EDITOR_cursorList.length; i++) {
      if (EDITOR_cursorList[i] === EDITOR_primaryCursor) {
        indexOfPrimaryCursor = i;
        break;
      }
    }

    //EDITOR_cursorIndex_find_closestLessThanOrEqualToExistingCursorIndex(postPosition);

    EDITOR_cursorList.splice(indexOfPrimaryCursor, 0, clone);
    EDITOR_baseElement.children[4].children[1].appendChild(clone.caretRow);
    EDITOR_drawCursor(clone);
    EDITOR_primaryCursor.selectionAnchor = postPosition;
    EDITOR_primaryCursor.selectionEnd = postPosition + input.value.length;
    EDITOR_primaryCursor.indexColumn += input.value.length;
    EDITOR_drawCursor(EDITOR_primaryCursor);

    // Move primary cursor to index 0 of cursor list.
    if (postPosition < prePosition) {
      EDITOR_cursorList.splice(indexOfPrimaryCursor + 1, 1);
      EDITOR_cursorList.splice(0, 0, EDITOR_primaryCursor);
    }
  } else {// TODO: this is dead code with the pre-check of next match number?
    //EDITOR_primaryCursor.selectionAnchor = clone.selectionAnchor;
    //EDITOR_primaryCursor.selectionEnd = clone.selectionEnd;
    //EDITOR_primaryCursor.indexLine = clone.indexLine;
    //EDITOR_primaryCursor.indexColumn = clone.indexColumn;
    //EDITOR_drawCursor(EDITOR_primaryCursor);
  }
}
function EDITOR_cursorIndex_find_closestLessThanOrEqualToExistingCursorIndex(positionIndex) {
  let left = 0;
  let right = EDITOR_cursorList.length - 1;
  let index = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    let cursorPositionIndex = EDITOR_getPositionIndex(EDITOR_cursorList[mid]);
    if (positionIndex <= cursorPositionIndex) {
      index = mid;
      if (positionIndex === cursorPositionIndex) {
        break;
      }
      right = mid - 1;
    } else if (positionIndex > cursorPositionIndex) {
      left = mid + 1;
    } else {
      return; // NaN
    }
  }
  return index;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_arrowDown(cursor, shiftKey) {
  EDITOR_movementBasedCacheInvalidation(cursor);
  EDITOR_preKeyboardMovementSelectionLogic(cursor, shiftKey);
  if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
    cursor.indexLine++;
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
    if (cursor.STORED_indexColumn > lastValidIndexColumn) {
      cursor.indexColumn = lastValidIndexColumn;
    } else {
      cursor.indexColumn = cursor.STORED_indexColumn;
    }
  }
  EDITOR_postKeyboardMovementSelectionLogic(cursor, shiftKey);
  EDITOR_drawCursor(cursor);
}

/**
 * This function is expected to be used for a variety of scenarios,
 * but the initial use-case is caching the indentation when holding the 'enter' key, so that each consecutive event can know what the indentation was on the previous
 * event and not have to re-calculate it.
 * 
 * Then, the idea is that when the cursor moves you invoke this to invalidate that indentation cache so it gets recalculated.
 * 
 * TODO: I am quite certain that there are cases where this should be invoked but it isn't currently.
 * 
 * TODO: I believe this function to be an unoptimized solution, just that there are more pressing matters to attend to.
 * 
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_movementBasedCacheInvalidation(cursor) {
  if (cursor.editKind === 8) {
    //
    // this only happens once even if you have many cursors because the next cursor that enters this function would be and editKind of None.
    //
    // The main concern is when a user holds down the Enter key, so while this change causes any cursor movement to finalize a pending Enter edit, it won't be nearly as detrimental as if holding down the Enter key were to not be optimized.
    //
    // TODO: Permit more than one Enter key edit event to batch
    // TODO: Cap the amount of enter key edit events that can batch as was done with the insertion.
    // TODO: Having Enter be an insertion, instead of its own EditKind, sounds like the better long term goal but it is believed that this change is trainsitionally helpful in getting to that final best solution.
    //
    EDITOR_finalizeAllCursors();
  }
  cursor.cached_indentation_byteList = null;
  cursor.cached_indentation_string = null;
  EDITOR_byte_fields[3] = false;
}

/**
 * @param {*} clipboardContent This is a temporary hack to help in transitioning paste to an edit.
 */
function EDITOR_editEvent(editKind, event, clipboardContent) {
  // check for pending => selection
  // if so then finalize all current pending
  // ...this actually is checking for selection, then presuming at least 1 cursor has a pending...
  let shouldFinalizeAllCursors = false;
  let atLeastOneCursorHasASelection = false;
  for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
    let cursor = EDITOR_cursorList[i];
    if (cursor.hasSelection()) {
      shouldFinalizeAllCursors = true;
      atLeastOneCursorHasASelection = true;
      break;
    }
  }
  if (shouldFinalizeAllCursors) {
    shouldFinalizeAllCursors = false;
    EDITOR_finalizeAllCursors();
  }

  // If you have delete/backspace you need to ONLY remove the selection if it exists not remove selection then delete/backspace
  // but insert needs to remove selection AND insert.
  if (editKind === 1 || editKind === 8 || editKind === 9) {
    // check for get_editKind_None() => selection
    // if so then attempt to remove selection foreach cursor
    // then finalize all those newly made selection removal edits
    if (atLeastOneCursorHasASelection) {
      shouldFinalizeAllCursors = true;
      for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.hasSelection()) {
          EDITOR_removeSelection(cursor);
        }
      }
    }
    if (shouldFinalizeAllCursors) {
      shouldFinalizeAllCursors = false;
      EDITOR_finalizeAllCursors();
    }
  }

  // check for NOTcanBatch... I don't want the switch in the for loop... if you have a selection then you have a not can batch?
  switch (editKind) {
    case 1:
      for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        if (EDITOR_NOTcanBatch_insert(cursor, i)) {
          shouldFinalizeAllCursors = true;
          break;
        }
      }
      break;
    case 2:
      for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        if (EDITOR_NOTcanBatch_delete(cursor)) {
          shouldFinalizeAllCursors = true;
          break;
        }
      }
      break;
    case 3:
      for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        if (EDITOR_NOTcanBatch_backspace(cursor)) {
          shouldFinalizeAllCursors = true;
          break;
        }
      }
      break;
    case 5:
      shouldFinalizeAllCursors = true;
      break;
    case 6:
      shouldFinalizeAllCursors = true;
      break;
    case 7:
      shouldFinalizeAllCursors = true;
      break;
    case 8:
      shouldFinalizeAllCursors = true;
      break;
    case 9:
      shouldFinalizeAllCursors = true;
      break;
    case 10:
      shouldFinalizeAllCursors = true;
      break;
    default:
      throw new Error(`The EditKind:${editKind} was not recognized.`);
      break;
  }
  if (shouldFinalizeAllCursors) {
    shouldFinalizeAllCursors = false;
    EDITOR_finalizeAllCursors();
  }

  // start/continue edit... I don't want the switch in the for loop
  switch (editKind) {
    case 1:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        EDITOR_int_fields[12] = i;
        EDITOR_movementBasedCacheInvalidation(cursor);
        if (EDITOR_int_fields[14] !== cursor.indexLine) {
          EDITOR_int_fields[14] = cursor.indexLine;
          EDITOR_int_fields[15] = 0;
        }
        // You can do this because the function 'EDITOR_NOTcanBatch_insert' was already checked for all the cursors, if it is possible to batch, the editKind will stay InsertLtr otherwise it is finalized and set to None.
        // TODO: Use if === get_EditKind_None() for copy and paste safety / it might just even be more readable
        if (cursor.editKind !== 1) {
          EDITOR_startEdit(cursor, 1, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
        }
        EDITOR_insertDo(cursor, event.key);
        cursor.STORED_indexColumn = cursor.indexColumn;
        EDITOR_drawCursor(cursor);
        EDITOR_int_fields[15] = EDITOR_int_fields[15] + cursor.editLength;
        EDITOR_int_fields[16] = EDITOR_int_fields[16] + cursor.editLength; // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
      }
      break;
    case 2:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        EDITOR_int_fields[12] = i;
        EDITOR_movementBasedCacheInvalidation(cursor);
        if (EDITOR_int_fields[14] !== cursor.indexLine) {
          EDITOR_int_fields[14] = cursor.indexLine;
          EDITOR_int_fields[15] = 0;
        }
        if (cursor.hasSelection()) {
          EDITOR_removeSelection(cursor);
        } else {
          if (cursor.editKind !== 2) {
            EDITOR_startEdit(cursor, 2, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
          }
          EDITOR_deleteDo(cursor, event);
        }
        EDITOR_drawCursor(cursor);
        EDITOR_int_fields[15] = EDITOR_int_fields[15] - cursor.editLength;
        EDITOR_int_fields[16] = EDITOR_int_fields[16] - cursor.editLength; // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
      }
      break;
    case 3:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        EDITOR_int_fields[12] = i;
        EDITOR_movementBasedCacheInvalidation(cursor);
        if (EDITOR_int_fields[14] !== cursor.indexLine) {
          EDITOR_int_fields[14] = cursor.indexLine;
          EDITOR_int_fields[15] = 0;
        }
        if (cursor.hasSelection()) {
          EDITOR_removeSelection(cursor);
        } else {
          if (cursor.editKind !== 3) {
            EDITOR_startEdit(cursor, 3, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
          }
          EDITOR_backspaceDo(cursor, event);
          cursor.STORED_indexColumn = cursor.indexColumn;
        }
        EDITOR_drawCursor(cursor);
        EDITOR_int_fields[15] = EDITOR_int_fields[15] - cursor.editLength;
        EDITOR_int_fields[16] = EDITOR_int_fields[16] - cursor.editLength; // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
      }
      break;
    case 5:
      for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        EDITOR_movementBasedCacheInvalidation(cursor);
        if (cursor.hasSelection()) {
          if (event.shiftKey) {
            if (cursor.editKind !== 7) {
              EDITOR_startEdit(cursor, 7, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
            }
            EDITOR_indentLess(cursor);
          } else {
            if (cursor.editKind !== 6) {
              EDITOR_startEdit(cursor, 6, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
            }
            EDITOR_indentMore(cursor);
          }
        } else {
          if (event.shiftKey) {
            // TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor...
            // ...multi-cursor in and of itself is buggy that's why I'm not overly concerned with adding this in a bugged state...
            // ...everything is buggy and it is very anxiety inducing and for the time being I guess it just has to be that way as I transition
            // towards a useable editor all the features are coming together but there's this awkward phase of "I can start using it but also not really" or something I just idk.
            EDITOR_onMouseDownDetailRankThree({
              shiftKey: false
            }, cursor.indexLine, cursor.indexColumn);
            if (cursor.editKind !== 7) {
              EDITOR_startEdit(cursor, 7, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
            }
            EDITOR_indentLess(cursor);
          } else {
            if (cursor.editKind !== 5) {
              EDITOR_startEdit(cursor, 5, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
            }
            EDITOR_tabKey(cursor);
          }
        }
        EDITOR_drawCursor(cursor);
      }
      break;
    case 8:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.editKind !== 8) {
          EDITOR_startEdit(cursor, 8, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
        }
        EDITOR_EnterKey(cursor, event.ctrlKey, event.shiftKey);
        cursor.STORED_indexColumn = cursor.indexColumn;
        EDITOR_drawCursor(cursor);
        EDITOR_int_fields[13] = EDITOR_int_fields[13] + 1;
      }
      break;
    case 9:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.editKind !== 8) {
          EDITOR_startEdit(cursor, 9, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
        }
        EDITOR_paste(cursor, clipboardContent);
        cursor.STORED_indexColumn = cursor.indexColumn;
        EDITOR_drawCursor(cursor);
      }
      break;
    case 10:
      for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.editKind !== 10) {
          EDITOR_startEdit(cursor, 10, EDITOR_getPositionIndex_raw(cursor), /*editLength*/0);
        }
        EDITOR_duplicateSelection(cursor);
        cursor.STORED_indexColumn = cursor.indexColumn;
        EDITOR_drawCursor(cursor);
      }
      break;
    default:
      throw new Error(`The EditKind:${editKind} was not recognized.`);
      break;
  }
}
function EDITOR_registerHandlers() {
  EDITOR_baseElement.addEventListener('keydown', async event => {
    // Explicitly inlining 'clearMulticursorState()' because it currently is and I just don't want to make a decision about this right now.
    // So what I can do is mark the code paragraph for later decision making.
    EDITOR_int_fields[12] = 0;
    EDITOR_int_fields[13] = 0;
    EDITOR_int_fields[14] = 0;
    EDITOR_int_fields[15] = 0;
    EDITOR_int_fields[16] = 0;
    EDITOR_offsetWithinSpan_withRespectToThisSpan = null;
    EDITOR_int_fields[17] = 0;
    switch (event.key) {
      case 'ArrowLeft':
        {
          event.preventDefault();
          for (var i = 0; i < EDITOR_cursorList.length; i++) {
            let cursor = EDITOR_cursorList[i];
            EDITOR_int_fields[12] = i;
            EDITOR_movementBasedCacheInvalidation(cursor);
            if (EDITOR_int_fields[14] !== cursor.indexLine) {
              EDITOR_int_fields[14] = cursor.indexLine;
              EDITOR_int_fields[15] = 0;
            }
            if (cursor.hasSelection() && !event.shiftKey) {
              let small;
              if (cursor.selectionAnchor < cursor.selectionEnd) {
                small = cursor.selectionAnchor;
              } else {
                small = cursor.selectionEnd;
              }
              let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(small);
              cursor.indexLine = lineAndColumnIndices.indexLine;
              cursor.indexColumn = lineAndColumnIndices.indexColumn;
              cursor.selectionAnchor = cursor.selectionEnd;
              cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
              cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
            } else {
              EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
              if (event.ctrlKey & cursor.indexColumn > 0) {
                let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
                let indexPosition = line.start + cursor.indexColumn;
                let originalCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, indexPosition);
                cursor.indexColumn--;
                indexPosition--;
                while (cursor.indexColumn > 0) {
                  if (EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, indexPosition) === originalCharacterKind) {
                    cursor.indexColumn--;
                    indexPosition--;
                  } else {
                    break;
                  }
                }
              } else {
                if (cursor.indexColumn > 0) {
                  cursor.indexColumn--;
                } else if (cursor.indexLine > 0) {
                  cursor.indexLine--;
                  cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                }
              }
              EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            }
            cursor.STORED_indexColumn = cursor.indexColumn;
            EDITOR_drawCursor(cursor);
            EDITOR_int_fields[15] = EDITOR_int_fields[15] + cursor.editLength;
            EDITOR_int_fields[16] = EDITOR_int_fields[16] + cursor.editLength;
          }
          break;
        }
      case 'ArrowDown':
        {
          event.preventDefault();
          if (event.ctrlKey) {
            EDITOR_baseElement.scrollBy(0, EDITOR_int_fields[2]);
          } else if (event.altKey) {
            if (event.shiftKey) {
              EDITOR_createCursorLineBelow(event);
            }
          } else {
            let lastCursor = EDITOR_cursorList[EDITOR_cursorList.length - 1];
            if (lastCursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
              if (EDITOR_cursorList.length - 1 > 0 && EDITOR_cursorList[EDITOR_cursorList.length - 2].indexLine === lastCursor.indexLine - 1) {
                alert("ArrowDown: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                return;
              }
            }
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
              EDITOR_arrowDown(EDITOR_cursorList[i], /*shiftKey*/event.shiftKey);
            }
          }
          break;
        }
      case 'ArrowUp':
        {
          event.preventDefault();
          if (event.ctrlKey) {
            EDITOR_baseElement.scrollBy(0, -1 * EDITOR_int_fields[2]);
          } else {
            let firstCursor = EDITOR_cursorList[0];
            if (firstCursor.indexLine === 0) {
              if (EDITOR_cursorList.length - 1 > 0 && EDITOR_cursorList[1].indexLine === firstCursor.indexLine + 1) {
                alert("ArrowUp: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                return;
              }
            }
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
              let cursor = EDITOR_cursorList[i];
              EDITOR_movementBasedCacheInvalidation(cursor);
              EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
              if (cursor.indexLine > 0) {
                cursor.indexLine--;
                let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                if (cursor.STORED_indexColumn > lastValidIndexColumn) {
                  cursor.indexColumn = lastValidIndexColumn;
                } else {
                  cursor.indexColumn = cursor.STORED_indexColumn;
                }
              }
              EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
              EDITOR_drawCursor(cursor);
            }
          }
          break;
        }
      case 'ArrowRight':
        {
          event.preventDefault();
          for (var i = 0; i < EDITOR_cursorList.length; i++) {
            let cursor = EDITOR_cursorList[i];
            EDITOR_int_fields[12] = i;
            EDITOR_movementBasedCacheInvalidation(cursor);
            if (EDITOR_int_fields[14] !== cursor.indexLine) {
              EDITOR_int_fields[14] = cursor.indexLine;
              EDITOR_int_fields[15] = 0;
            }
            if (cursor.hasSelection() && !event.shiftKey) {
              let large;
              if (cursor.selectionAnchor < cursor.selectionEnd) {
                large = cursor.selectionEnd;
              } else {
                large = cursor.selectionAnchor;
              }
              let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(large);
              cursor.indexLine = lineAndColumnIndices.indexLine;
              cursor.indexColumn = lineAndColumnIndices.indexColumn;
              cursor.selectionAnchor = cursor.selectionEnd;
              cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
              cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
            } else {
              EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
              let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
              if (event.ctrlKey & cursor.indexColumn < lastValidIndexColumn) {
                let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
                let indexPosition = line.start + cursor.indexColumn;
                let originalCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, indexPosition, line.end);
                cursor.indexColumn++;
                indexPosition++;
                while (cursor.indexColumn < lastValidIndexColumn) {
                  if (EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, indexPosition, line.end) === originalCharacterKind) {
                    cursor.indexColumn++;
                    indexPosition++;
                  } else {
                    break;
                  }
                }
              } else {
                if (cursor.indexColumn < lastValidIndexColumn) {
                  cursor.indexColumn++;
                } else if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
                  cursor.indexColumn = 0;
                  cursor.indexLine++;
                }
              }
              EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            }
            cursor.STORED_indexColumn = cursor.indexColumn;
            EDITOR_drawCursor(cursor);
            EDITOR_int_fields[15] = EDITOR_int_fields[15] + cursor.editLength;
            EDITOR_int_fields[16] = EDITOR_int_fields[16] + cursor.editLength;
          }
          break;
        }
      case 'Home':
        {
          event.preventDefault();
          if (event.ctrlKey && EDITOR_cursorList.length > 1) {
            alert("Home: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
            return;
          }
          for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
            let cursor = EDITOR_cursorList[i];
            EDITOR_movementBasedCacheInvalidation(cursor);
            EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            if (event.ctrlKey) {
              cursor.indexLine = 0;
              cursor.indexColumn = 0;
            } else {
              let endExclusiveIndentationIndexColumn = EDITOR_findEndExclusiveIndentationIndexColumn(cursor);
              if (cursor.indexColumn == endExclusiveIndentationIndexColumn) {
                cursor.indexColumn = 0;
              } else {
                cursor.indexColumn = endExclusiveIndentationIndexColumn;
              }
            }
            EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            cursor.STORED_indexColumn = cursor.indexColumn;
            EDITOR_drawCursor(cursor);
          }
          break;
        }
      case 'End':
        {
          event.preventDefault();
          if (event.ctrlKey && EDITOR_cursorList.length > 1) {
            alert("End: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
            return;
          }
          for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
            let cursor = EDITOR_cursorList[i];
            EDITOR_movementBasedCacheInvalidation(cursor);
            EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            if (event.ctrlKey) {
              cursor.indexLine = EDITOR_lineEndPositionList.count - 1;
            }
            cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
            EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
            cursor.STORED_indexColumn = cursor.indexColumn;
            EDITOR_drawCursor(cursor);
          }
          break;
        }
      case 'PageDown':
        {
          if (event.ctrlKey) {
            // This doesn't seem to make a difference for me but I feel like I should have this line regardless...
            // ...in case someone's computer for some reason would end up having default behavior even though mine seems to not.
            event.preventDefault();
            EDITOR_primaryCursor.indexLine = EDITOR_int_fields[8] + EDITOR_int_fields[9];
            if (EDITOR_int_fields[9] > 1) {
              // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
              EDITOR_primaryCursor.indexLine--;
            }
            if (EDITOR_primaryCursor.indexLine >= EDITOR_lineEndPositionList.count) {
              // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
              EDITOR_primaryCursor.indexLine = EDITOR_lineEndPositionList.count - 1;
            }
            EDITOR_primaryCursor.indexColumn = 0;
            // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
            EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
            EDITOR_drawCursor(EDITOR_primaryCursor);
          }
          break;
        }
      case 'PageUp':
        {
          if (event.ctrlKey) {
            // This doesn't seem to make a difference for me but I feel like I should have this line regardless...
            // ...in case someone's computer for some reason would end up having default behavior even though mine seems to not.
            event.preventDefault();
            EDITOR_primaryCursor.indexLine = EDITOR_int_fields[8];
            if (EDITOR_int_fields[9] > 1) {
              // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
              EDITOR_primaryCursor.indexLine++;
            }
            if (EDITOR_primaryCursor.indexLine >= EDITOR_lineEndPositionList.count) {
              // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
              EDITOR_primaryCursor.indexLine = EDITOR_lineEndPositionList.count - 1;
            }
            EDITOR_primaryCursor.indexColumn = 0;
            // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
            EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
            EDITOR_drawCursor(EDITOR_primaryCursor);
          }
          break;
        }
      case 'Delete':
        {
          EDITOR_editEvent(2, event);
          break;
        }
      case 'Backspace':
        {
          EDITOR_editEvent(3, event);
          break;
        }
      case 'Escape':
        {
          EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
          break;
        }
      case ' ':
        {
          event.preventDefault();
          // len is 1 of this case, pattern doesn't match on purpose
          break;
        }
      case 'Tab':
        {
          event.preventDefault();
          EDITOR_editEvent(5, event);
          break;
        }
      case 'Enter':
        {
          // Enter key relies on cached data that would be cleared, pattern doesn't match on purpose
          EDITOR_editEvent(8, event);
          break;
        }
      case 'F12':
        {
          //await window.myAPI.editorDocumentSymbolsRequest();
          break;
        }
    }

    // TODO: Checking for a length of 1 is probably wrong but it'll let me start writing some code
    if (event.key.length === 1) {
      if (event.ctrlKey) {
        EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
        switch (event.key) {
          case 'c':
            EDITOR_finalizeAllCursors();
            await EDITOR_copySelection(EDITOR_primaryCursor);
            break;
          case 'x':
            EDITOR_finalizeAllCursors();
            await EDITOR_copySelection(EDITOR_primaryCursor);
            EDITOR_removeSelection(EDITOR_primaryCursor); // TODO: Multicursor bad
            EDITOR_drawCursor(EDITOR_primaryCursor);
            break;
          case 'v':
            let clipboard = await window.myAPI.readClipboard();
            EDITOR_editEvent(9, event, clipboard);
            break;
          case 'd':
            EDITOR_editEvent(10, event);
            break;
          case 'a':
            event.preventDefault();
            EDITOR_finalizeAllCursors(); // TODO: Multicursor bad
            EDITOR_primaryCursor.selectionAnchor = 0;
            EDITOR_primaryCursor.selectionEnd = EDITOR_textByteList.count;
            let selectionEndLineAndColumnIndices = EDITOR_getLineAndColumnIndices(EDITOR_primaryCursor.selectionEnd);
            EDITOR_primaryCursor.indexLine = selectionEndLineAndColumnIndices.indexLine;
            EDITOR_primaryCursor.indexColumn = selectionEndLineAndColumnIndices.indexColumn;
            EDITOR_drawCursor(EDITOR_primaryCursor, /*NOTscrollCursorIntoView*/true);
            break;
          case 'f':
            EDITOR_findOverlay_showSetter(!EDITOR_byte_fields[2]);
            break;
          case 'z':
            //alert('undo');
            break;
          case 'y':
            //alert('redo');
            break;
        }
      } else if (event.altKey) {
        switch (event.key) {
          case '>':
            if (event.shiftKey) {
              let local_findOverlay_isBeingShownDueToMultiCursorMatching = EDITOR_byte_fields[3];
              EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
              EDITOR_byte_fields[3] = local_findOverlay_isBeingShownDueToMultiCursorMatching;
              EDITOR_createCursorAtNextMatchSelection(event);
            }
            break;
        }
      } else {
        EDITOR_editEvent(1, event);
      }
      return;
    }
  });
  EDITOR_baseElement.addEventListener('mousedown', event => {
    EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
    if (EDITOR_cursorList.length > 1) {
      EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
    }

    // TODO: You might want to do this inside 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();' at the end... I'm not sure.
    EDITOR_int_fields[12] = 0;
    EDITOR_int_fields[15] = 0;
    EDITOR_int_fields[13] = 0;
    if (EDITOR_byte_fields[1]) {
      let boundingClientRect = EDITOR_baseElement.getBoundingClientRect();
      EDITOR_int_fields[28] = boundingClientRect.left;
      EDITOR_int_fields[29] = boundingClientRect.top;
      EDITOR_byte_fields[1] = 0;
    }
    if (event.button === 0) {
      EDITOR_byte_fields[4] = true;
      EDITOR_onMouseMove_timer = null;
    }
    let rY = event.clientY - EDITOR_int_fields[29] + EDITOR_baseElement.scrollTop;
    let rX = event.clientX - EDITOR_int_fields[28] - EDITOR_int_fields[7] + EDITOR_baseElement.scrollLeft;
    let indexLine = Math.floor(rY / EDITOR_int_fields[2]);
    let indexColumn = Math.round(rX / EDITOR_characterWidth);
    if (indexLine < 0) {
      indexLine = 0;
    }
    if (indexColumn < 0) {
      indexColumn = 0;
    }
    if (indexLine >= EDITOR_lineEndPositionList.count) {
      indexLine = EDITOR_lineEndPositionList.count - 1;
    }
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(indexLine);
    if (indexColumn > lastValidIndexColumn) {
      indexColumn = lastValidIndexColumn;
    }
    if (rX < -1 * EDITOR_gutterPaddingRight) {
      EDITOR_byte_fields[0] = 3;
      EDITOR_onMouseDownDetailRankThree(event, indexLine, indexColumn);
      return;
    }
    if (event.detail % 3 === 0) {
      EDITOR_byte_fields[0] = 3;
      EDITOR_onMouseDownDetailRankThree(event, indexLine, indexColumn);
    } else if (event.detail % 2 === 0) {
      EDITOR_byte_fields[0] = 2;
      EDITOR_onMouseDownDetailRankTwo(event, indexLine, indexColumn);
    } else {
      EDITOR_byte_fields[0] = 1;
      EDITOR_onMouseDownDetailRankOne(event, indexLine, indexColumn);
    }
  });
  EDITOR_baseElement.addEventListener('mousemove', EDITOR_onMouseMove_WRAPIT.bind(this));
  EDITOR_baseElement.addEventListener('scroll', EDITOR_onScroll_WRAPIT.bind(this));
  EDITOR_baseElement.addEventListener('wheel', event => {
    if (event.shiftKey) {
      EDITOR_baseElement.scrollBy(event.deltaY, 0);
      EDITOR_baseElement.children[2].children[0].scrollLeft = EDITOR_baseElement.scrollLeft;
    }
  });
  EDITOR_baseElement.addEventListener('contextmenu', async event => {
    let optionList = [new MenuOption(CommandKind.Cut, 'Cut', null), new MenuOption(CommandKind.Copy, 'Copy', null), new MenuOption(CommandKind.Paste, 'Paste', null), new MenuOption(CommandKind.Find, 'Find', null)];
    let menuLeft = EDITOR_int_fields[28] + EDITOR_int_fields[7] + EDITOR_primaryCursor.cursorLeftValue - EDITOR_baseElement.scrollLeft;
    let menuTop = EDITOR_int_fields[29] + EDITOR_primaryCursor.cursorTopValue + EDITOR_int_fields[2] - EDITOR_baseElement.scrollTop;
    if (event.button === 2) {
      menuSet('EDITOR', null, optionList, menuLeft, menuTop);
    } else {
      menuSet('EDITOR', null, optionList, menuLeft, menuTop);
    }
  });
  window.addEventListener('resize', EDITOR_onResize_WRAPIT.bind(this));
  EDITOR_baseElement.children[2].children[0].addEventListener('scroll', () => {
    EDITOR_baseElement.scrollLeft = EDITOR_baseElement.children[2].children[0].scrollLeft;
  });
}
function EDITOR_findOverlay_doSearch() {
  let input = document.getElementById('EDITOR_findOverlay_input_elementId');
  if (!input || !input.value) return;
  let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
  if (!spanCurrent) return;
  let spanTotal = document.getElementById('EDITOR_findOverlay_total');
  if (!spanTotal) return;
  EDITOR_byte_fields[6] = true;
  let searchEncoded = EDITOR_encoder.encode(input.value);
  EDITOR_finalizeAllCursors();
  EDITOR_findOverlay_searchResultPositionList.clear();
  let offset = 0;
  let posStartOfMatch = 0;

  /** Given the current EDITOR_primaryCursor position, which match comes next. */
  let nextMatchNumber = -1;
  let nextMatchPos;
  if (EDITOR_primaryCursor.hasSelection()) {
    let small = EDITOR_primaryCursor.selectionAnchor;
    let large = EDITOR_primaryCursor.selectionEnd;
    if (EDITOR_primaryCursor.selectionAnchor > EDITOR_primaryCursor.selectionEnd) {
      small = EDITOR_primaryCursor.selectionEnd;
      large = EDITOR_primaryCursor.selectionAnchor;
    }
    nextMatchPos = small;
  } else {
    nextMatchPos = EDITOR_getPositionIndex(EDITOR_primaryCursor);
  }
  if (EDITOR_byte_fields[7] && (searchEncoded[0] >= 97 && searchEncoded[0] <= 122 || searchEncoded[0] >= 65 && searchEncoded[0] <= 90 || searchEncoded[0] >= 48 && searchEncoded[0] <= 57 || searchEncoded[0] === 95)) {
    for (let i = 0; i < EDITOR_textByteList.count; i++) {
      if (EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122 || EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90 || EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57 || EDITOR_textByteList.bytes[i] === 95) {
        if (EDITOR_textByteList.bytes[i] === searchEncoded[0]) {
          while (i < EDITOR_textByteList.count) {
            // context switch to checking match
            if (EDITOR_textByteList.bytes[i] === searchEncoded[offset]) {
              if (offset === 0) {
                posStartOfMatch = i;
              }
              offset++;
              if (offset === searchEncoded.length) {
                // found "possible match"
                if (i + 1 >= EDITOR_textByteList.count || !(EDITOR_textByteList.bytes[i + 1] >= 97 && EDITOR_textByteList.bytes[i + 1] <= 122 || EDITOR_textByteList.bytes[i + 1] >= 65 && EDITOR_textByteList.bytes[i + 1] <= 90 || EDITOR_textByteList.bytes[i + 1] >= 48 && EDITOR_textByteList.bytes[i + 1] <= 57 || EDITOR_textByteList.bytes[i + 1] === 95)) {
                  // ends on a word, therefore take match
                  EDITOR_findOverlay_searchResultPositionList.insert(EDITOR_findOverlay_searchResultPositionList.count, posStartOfMatch);
                  if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
                    nextMatchNumber = EDITOR_findOverlay_searchResultPositionList.count;
                    nextMatchPos = posStartOfMatch;
                  }
                  offset = 0;
                  break;
                } else {
                  // does NOT end on a word, therefore ignore match
                  offset = 0;
                  while (i < EDITOR_textByteList.count) {
                    // move pos to next NON(letterOrDigit) or EOF
                    if (!(EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122 || EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90 || EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57 || EDITOR_textByteList.bytes[i] === 95)) {
                      i--; // backtrack by one due to outer for loop's incrementation step
                      break;
                    }
                    i++;
                  }
                  break;
                }
              }
              i++;
            } else {
              offset = 0;
              while (i < EDITOR_textByteList.count) {
                // move pos to next NON(letterOrDigit) or EOF
                if (!(EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122 || EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90 || EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57 || EDITOR_textByteList.bytes[i] === 95)) {
                  i--; // backtrack by one due to outer for loop's incrementation step
                  break;
                }
                i++;
              }
              break;
            }
          }
        } else {
          while (i < EDITOR_textByteList.count) {
            // move pos to next NON(letterOrDigit) or EOF
            if (!(EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122 || EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90 || EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57 || EDITOR_textByteList.bytes[i] === 95)) {
              i--; // backtrack by one due to outer for loop's incrementation step
              break;
            }
            i++;
          }
        }
      } else {
        while (i < EDITOR_textByteList.count) {
          // move pos to next letterOrDigit or EOF
          if (EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122 || EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90 || EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57 || EDITOR_textByteList.bytes[i] === 95) {
            i--; // backtrack by one due to outer for loop's incrementation step
            break;
          }
          i++;
        }
      }
    }
  } else {
    for (let i = 0; i < EDITOR_textByteList.count; i++) {
      if (EDITOR_textByteList.bytes[i] === searchEncoded[offset]) {
        if (offset === 0) {
          posStartOfMatch = i;
        }
        offset++;
        if (offset === searchEncoded.length) {
          EDITOR_findOverlay_searchResultPositionList.insert(EDITOR_findOverlay_searchResultPositionList.count, posStartOfMatch);
          if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
            nextMatchNumber = EDITOR_findOverlay_searchResultPositionList.count;
            nextMatchPos = posStartOfMatch;
          }
          offset = 0;
        }
      } else {
        // I'm not sure how I like this. It feels wasteful to set this to 0.
        // But if I check to see if it is 0, that feels even more wasteful.
        offset = 0;
      }
    }
  }
  if (nextMatchNumber === -1) {
    nextMatchNumber = 1;
  }
  spanCurrent.innerText = nextMatchNumber;
  spanTotal.innerText = EDITOR_findOverlay_searchResultPositionList.count;
}
function EDITOR_findOverlay_input_onkeydown(event) {
  switch (event.key) {
    case 'Enter':
      EDITOR_findOverlay_doSearch();
      break;
    case 'Escape':
      EDITOR_byte_fields[6] = false;
      EDITOR_findOverlay_showSetter(false);
      EDITOR_baseElement.focus();
      break;
  }
}
function EDITOR_findOverlay_input_onblur() {
  if (!EDITOR_byte_fields[6]) {
    EDITOR_findOverlay_doSearch();
  }
}
function EDITOR_findOverlay_input_onchange() {
  EDITOR_byte_fields[6] = false;
}
function EDITOR_findOverlay_checkboxMatchWord_onchange() {
  // for an onchange event, event.target might always be precise?
  let checkboxMatchWord = document.getElementById('EDITOR_findOverlay_checkboxMatchWord');
  if (checkboxMatchWord) {
    EDITOR_byte_fields[7] = checkboxMatchWord.checked;
    EDITOR_findOverlay_doSearch();
  }
}
function EDITOR_findOverlay_showSetter(showValue) {
  EDITOR_finalizeAllCursors();
  if (!EDITOR_byte_fields[2] && showValue) {
    EDITOR_findOverlay.style.visibility = '';
    EDITOR_findOverlay_searchResultPositionList = new UInt32List(256);
    let input = document.createElement('input');
    input.id = 'EDITOR_findOverlay_input_elementId';
    // 'change' needs to be the first event added so the 'Enter' keydown happens with proper timing
    input.addEventListener('change', EDITOR_findOverlay_input_onchange);
    input.addEventListener('keydown', EDITOR_findOverlay_input_onkeydown);
    input.addEventListener('blur', EDITOR_findOverlay_input_onblur);
    EDITOR_findOverlay.appendChild(input);
    if (!EDITOR_byte_fields[3]) {
      input.focus();
    }
    let divCurrentOfTotal = document.createElement('div');
    let spanBlank = document.createElement('span');
    spanBlank.innerText = '1';
    spanBlank.id = 'EDITOR_findOverlay_current';
    divCurrentOfTotal.appendChild(spanBlank);
    let spanBlankOf = document.createElement('span');
    spanBlankOf.innerText = ' of ';
    divCurrentOfTotal.appendChild(spanBlankOf);
    let spanBlankOfBlank = document.createElement('span');
    spanBlankOfBlank.innerText = '10';
    spanBlankOfBlank.id = 'EDITOR_findOverlay_total';
    divCurrentOfTotal.appendChild(spanBlankOfBlank);
    EDITOR_findOverlay.appendChild(divCurrentOfTotal);
    let divPrevNext = document.createElement('div');
    let btnPrev = document.createElement('button');
    btnPrev.innerText = 'prev';
    btnPrev.id = 'EDITOR_findOverlay_prev';
    btnPrev.style.marginRight = '5px';
    let btnNext = document.createElement('button');
    btnNext.innerText = 'next';
    btnNext.id = 'EDITOR_findOverlay_next';
    btnPrev.addEventListener('click', EDITOR_btnPrev_onclick);
    btnNext.addEventListener('click', EDITOR_btnNext_onclick);
    divPrevNext.appendChild(btnPrev);
    divPrevNext.appendChild(btnNext);
    EDITOR_findOverlay.appendChild(divPrevNext);
    let divOptions = document.createElement('div');
    let checkboxMatchWord = document.createElement('input');
    checkboxMatchWord.type = 'checkbox';
    checkboxMatchWord.id = 'EDITOR_findOverlay_checkboxMatchWord';
    checkboxMatchWord.checked = Boolean(EDITOR_byte_fields[7]);
    checkboxMatchWord.addEventListener('change', EDITOR_findOverlay_checkboxMatchWord_onchange);
    divOptions.appendChild(checkboxMatchWord);
    let label_for_checkboxMatchWord = document.createElement('label');
    label_for_checkboxMatchWord.htmlFor = 'EDITOR_findOverlay_checkboxMatchWord';
    label_for_checkboxMatchWord.textContent = 'matchWord';
    divOptions.appendChild(label_for_checkboxMatchWord);
    EDITOR_findOverlay.appendChild(divOptions);
    if (EDITOR_primaryCursor.hasSelection()) {
      EDITOR_finalizeAllCursors();
      let selectionAnchor = EDITOR_primaryCursor.selectionAnchor;
      let selectionEnd = EDITOR_primaryCursor.selectionEnd;
      let small;
      let large;
      if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
      } else {
        small = selectionEnd;
        large = selectionAnchor;
      }
      let offset = small;
      let length = large - small;
      if (length <= 256) {
        input.value = EDITOR_decode_textonly(offset, length);
        EDITOR_findOverlay_doSearch();
      }
    }
  } else if (EDITOR_byte_fields[2] && !showValue) {
    EDITOR_findOverlay.style.visibility = 'hidden';
    EDITOR_findOverlay_searchResultPositionList = null;
    let input = document.getElementById('EDITOR_findOverlay_input_elementId');
    if (input && input.parentElement === EDITOR_findOverlay) {
      input.removeEventListener('change', EDITOR_findOverlay_input_onchange);
      input.removeEventListener('keydown', EDITOR_findOverlay_input_onkeydown);
      input.removeEventListener('blur', EDITOR_findOverlay_input_onblur);
      EDITOR_findOverlay.removeChild(input);
    }
    let btnPrev = document.getElementById('EDITOR_findOverlay_prev');
    if (btnPrev) {
      btnPrev.removeEventListener('click', EDITOR_btnPrev_onclick);
    }
    let btnNext = document.getElementById('EDITOR_findOverlay_next');
    if (btnNext) {
      btnNext.removeEventListener('click', EDITOR_btnNext_onclick);
    }
    let checkboxMatchWord = document.getElementById('EDITOR_findOverlay_checkboxMatchWord');
    if (checkboxMatchWord) {
      checkboxMatchWord.removeEventListener('change', EDITOR_findOverlay_checkboxMatchWord_onchange);
    }
    EDITOR_findOverlay.innerHTML = '';
    EDITOR_byte_fields[3] = false;
  }
  EDITOR_byte_fields[2] = showValue;
}
function EDITOR_btnPrev_onclick(/*event*/
) {
  let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
  if (!spanCurrent) return;
  let spanTotal = document.getElementById('EDITOR_findOverlay_total');
  if (!spanTotal) return;
  let current = parseInt(spanCurrent.innerText, 10);
  let total = parseInt(spanTotal.innerText, 10);
  if (current && total) {
    current--;
    if (current < 1 || current >= total) {
      if (total > 1) {
        current = total;
      } else {
        current = 1;
      }
    }
    spanCurrent.innerText = current;
  } else {
    spanCurrent.innerText = 'parseInt not successful?';
  }
  let index = current - 1;
  if (index >= 0 && index < total && index < EDITOR_findOverlay_searchResultPositionList.count) {
    let pos = EDITOR_findOverlay_searchResultPositionList.data[index];
    if (pos <= EDITOR_textByteList.count) {
      EDITOR_moveCursor_position(pos);
    }
  }
}
function EDITOR_btnNext_onclick() {
  let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
  if (!spanCurrent) return;
  let spanTotal = document.getElementById('EDITOR_findOverlay_total');
  if (!spanTotal) return;
  let current = parseInt(spanCurrent.innerText, 10);
  let total = parseInt(spanTotal.innerText, 10);
  if (current && total) {
    current++;
    if (current > total || current < 1) {
      current = 1;
    }
    spanCurrent.innerText = current;
  } else {
    spanCurrent.innerText = 'parseInt not successful?';
  }
  let index = current - 1;
  if (index >= 0 && index < total && index < EDITOR_findOverlay_searchResultPositionList.count) {
    let pos = EDITOR_findOverlay_searchResultPositionList.data[index];
    if (pos <= EDITOR_textByteList.count) {
      EDITOR_moveCursor_position(pos);
    }
  }
}

/**
 * Invoking 'EDITOR_finalizeAllCursors()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 * @param {*} cursor 
 */
async function EDITOR_copySelection(cursor) {
  if (!cursor.hasSelection()) {
    // TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor
    EDITOR_onMouseDownDetailRankThree({
      shiftKey: false
    }, cursor.indexLine, cursor.indexColumn);
  }
  let selectionAnchor = cursor.selectionAnchor;
  let selectionEnd = cursor.selectionEnd;
  let small;
  let large;
  if (selectionAnchor < selectionEnd) {
    small = selectionAnchor;
    large = selectionEnd;
  } else {
    small = selectionEnd;
    large = selectionAnchor;
  }
  return window.myAPI.editorSetClipboard(EDITOR_textByteList.bytes, small, large - small, EDITOR_lineEndString);
}

/**
 * Invoking 'EDITOR_finalizeAllCursors()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 * @param {EDITOR_Cursor} cursor 
 */
async function EDITOR_duplicateSelection(cursor) {
  // Aaa
  //     - Modify the bytes and Modify the line end positions
  //         - immediately
  //         - as an edit
  // Bbb
  //     - Modify the tracked syntax
  //     - Draw the pending edit in the UI

  if (!cursor.hasSelection()) {
    // TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor...
    // ...these days the todo is somewhat incorrect, it takes cursor now, but you'd need to check whether this causes the selection of two cursors to overlap.
    EDITOR_onMouseDownDetailRankThree({
      shiftKey: false
    }, cursor.indexLine, cursor.indexColumn);
  }
  let selectionAnchor = cursor.selectionAnchor;
  let selectionEnd = cursor.selectionEnd;
  let small;
  let large;
  if (selectionAnchor < selectionEnd) {
    small = selectionAnchor;
    large = selectionEnd;
  } else {
    small = selectionEnd;
    large = selectionAnchor;
  }
  let length = large - small;
  cursor.editPosition = large;
  let large_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(large);
  cursor.editIndexLine = large_lineAndColumnIndices.indexLine;
  cursor.editIndexColumn = large_lineAndColumnIndices.indexColumn;
  cursor.editLength = length;
  cursor.indexLine = large_lineAndColumnIndices.indexLine;
  cursor.indexColumn = large_lineAndColumnIndices.indexColumn;
  cursor.EDITOR_duplicate_small = small;
  cursor.EDITOR_duplicate_length = length;
  EDITOR_duplicateSelection_drawUi(cursor, small, large, length);
  cursor.selectionAnchor = large;
  cursor.selectionEnd = large + length;
}
async function EDITOR_duplicateSelection_drawUi(cursor, small, large, length) {
  let positionIndex = large;
  let w = walkLineUntilColumnIndex(cursor);
  if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
    // TODO: silent error bad
    alert('// EDITOR_paste TODO: silent error bad');
    return;
  }

  ////////////////////////// Everything after paste's walk until paste's switch copy and pasting then modifying | start

  // no need for this tab logic when it comes to duplication p1

  let linesInsertedCount = 0;
  let insertionLength = 0;

  /** is a 0 based index, inclusive */
  let wordStart = 0;
  let wordLength = 0;

  // no need for this tab logic when it comes to duplication p2

  // No need to consider '\r\n' and etc... only '\n'
  let linefeedLength = 0;
  let relativeIndexLine = cursor.indexLine + EDITOR_int_fields[13] - EDITOR_int_fields[8];
  let lastShownLineIndex = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
  let last_valid_indexColumn_currentLine = EDITOR_getLastValidIndexColumn(cursor.indexLine);

  // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
  // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

  let shouldPreserveCssClassWhenSplittingAmongLine = false;
  let hasSeenLinefeed = false;
  let original_indexColumn_SpanTextContentRelative = w.indexColumn_SpanTextContentRelative;
  let original_span_textContent_length = w.span.textContent.length;
  let original_tracked_syntax_start = positionIndex - cursor.indexColumn + w.indexColumn_Sum;
  ////////////////////////// Everything after paste's walk until paste's switch copy and pasting then modifying | end

  for (var offset = 0; offset < length; offset++) {
    switch (EDITOR_textByteList.bytes[small + offset]) {
      case '\n':
        //
        if (wordLength > 0) writeWord();
        //
        insertionLength++;
        linesInsertedCount++;
        //
        linefeedLength++;
        break;
      default:
        //
        if (linefeedLength > 0) writeLinefeed();
        // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
        if (relativeIndexLine > lastShownLineIndex) return;
        //
        insertionLength++;
        //
        if (wordLength === 0) {
          wordStart = small + offset;
        }
        wordLength++;
        break;
    }
  }
  if (wordLength > 0) writeWord();else if (linefeedLength > 0) writeLinefeed();
  EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(positionIndex, insertionLength);
  if (linesInsertedCount > 0) {
    update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + linesInsertedCount);
    // I uncommented this, it isn't doing what I want it to.
    // I'm just gonna be done for now.
    //EDITOR_drawGutter_Width();
  }
  function writeWord() {
    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(wordStart, wordStart + wordLength)) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
    cursor.indexColumn += wordLength;
    last_valid_indexColumn_currentLine += wordLength;
    w.indexColumn_SpanTextContentRelative += wordLength;
    wordStart = 0;
    wordLength = 0;
  }

  /**
   * TODO: If this ends up working don't duplicate this code, this is the 'EDITOR_EnterKey' function; copy, paste, and probably modified.
   */
  function writeLinefeed() {
    if (!hasSeenLinefeed) {
      handleNotHasSeenLinefeed();
    }

    // TODO: this is a very lazy solution to the problem, likely a more optimal way is available. Also name the variable?
    // I don't think everything fully works but I'm trying to decide if I should go eat something.
    for (let handleLineCounter = 0; handleLineCounter < linefeedLength; handleLineCounter++) {
      if (relativeIndexLine > lastShownLineIndex) {
        // A scroll should take place and handle the rest
        // Note: any lines indices that don't change between the current scrollTop and what is shown with the new scrollTop...
        // ...won't redraw so you still need to run this code for some of the lines.
        // you could probably predict which lines in particular overlap or some such but it isn't being done here currently.
        break;
      }
      let lineDiv; // TODO: re-use the one you are removing?
      let removingVisuallyDiv;
      if (cursor.indexColumn === 0 && last_valid_indexColumn_currentLine !== 0) {
        // start of line
        if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
          if (relativeIndexLine === 0) {
            lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
            removingVisuallyDiv = null; // No div above you to remove
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
          }
        } else {
          lineDiv = EDITOR_getNewAndEmptyLineElement();
          removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
        }
        if (lineDiv) {
          EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine]);
          EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
          w.div = lineDiv;
          w.indexSpan = 0;
          w.span = lineDiv.children[w.indexSpan];
          w.indexColumn_Goal = 0;
          w.indexColumn_Sum = 0;
          w.indexColumn_SpanTextContentRelative = 0;
          cursor.indexLine++;
          cursor.indexColumn = 0;
          relativeIndexLine++;
        }
        continue;
      } else {
        // ensure this conditional branch continues if handled, otherwise it will execute the fallback case erroneously
        if (last_valid_indexColumn_currentLine === cursor.indexColumn) {
          // end of line
          if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
            if (relativeIndexLine === 0) {
              lineDiv = null;
              removingVisuallyDiv = null; // No div above you to remove
            } else {
              lineDiv = EDITOR_getNewAndEmptyLineElement();
              removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
            }
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
          }
          if (lineDiv) {
            // TODO: this is wrong you don't need to remove a div, just use that div again instead of making a new one to replace it.
            EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
            EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
            w.div = lineDiv;
            w.indexSpan = 0;
            w.span = lineDiv.children[w.indexSpan];
            w.indexColumn_Goal = 0;
            w.indexColumn_Sum = 0;
            w.indexColumn_SpanTextContentRelative = 0;
            cursor.indexLine++;
            cursor.indexColumn = 0;
            last_valid_indexColumn_currentLine = 0;
            relativeIndexLine++;
          }
          continue;
        } else {
          // among a line
          // This case can only happen once at the start of the edit
          if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
            if (relativeIndexLine === 0) {
              lineDiv = null;
              removingVisuallyDiv = null; // No div above you to remove
            } else {
              lineDiv = EDITOR_getNewAndEmptyLineElement();
              removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
            }
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
          }
          if (lineDiv) {
            if (w.indexColumn_Goal > 0) {
              if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
                let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
                let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
                last_valid_indexColumn_currentLine = lastText.length;
                w.span.innerText = firstText;
                if (shouldPreserveCssClassWhenSplittingAmongLine) {
                  lineDiv.children[0].className = w.span.className;
                  lineDiv.children[0].innerText += lastText;
                } else {
                  // TODO: don't create a span here, the div already has one available that isn't being used...
                  // ...although that's only because you are creating a new div, if you fix that which is on its own a separate issue
                  // then maybe this... I think it would still have at least 1 empty span though?
                  //
                  let span = document.createElement('span');
                  span.innerText = lastText;
                  lineDiv.appendChild(span);
                }
              }
              let rememberIndex = w.indexSpan + 1;
              let rememberLength = w.div.children.length;
              for (let i = rememberIndex; i < rememberLength; i++) {
                lineDiv.appendChild(w.div.children[rememberIndex]);
              }
            }
            EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
            EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
            w.div = lineDiv;
            w.indexSpan = 0;
            w.span = lineDiv.children[w.indexSpan];
            w.indexColumn_Goal = 0;
            w.indexColumn_Sum = 0;
            w.indexColumn_SpanTextContentRelative = 0;
            cursor.indexLine++;
            cursor.indexColumn = 0;
            // last_valid_indexColumn_currentLine is being set when splitting the text.
            relativeIndexLine++;
          }
          continue;
        }
      }
    }
    linefeedLength = 0;
  }

  /** Maybe some cases are not necessary here because in order to have linefeed inserted it would've had to already existed thus the syntax would already be '..M' */
  function handleNotHasSeenLinefeed() {
    // The only way to invoke this is if you encountered a linefeed for the first time,
    // therefore 'w.span' is the original span and no variable for the original needs to be made.
    // (unless in the future you don't end up using the w.span in some way or etc...)
    //
    hasSeenLinefeed = true;
    switch (w.span.className) {
      case 'eCm':
        if (original_indexColumn_SpanTextContentRelative >= 2 && original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 2) {
          w.span.className = 'eCM';
          let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
          EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.Comment, indexPosition - cursor.indexColumn + w.indexColumn_Sum, original_span_textContent_length);
          shouldPreserveCssClassWhenSplittingAmongLine = true;
        }
        break;
      case 'eCM':
        shouldPreserveCssClassWhenSplittingAmongLine = true;
        break;
      case 'eSm':
        if (original_indexColumn_SpanTextContentRelative >= 1 && original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 1) {
          w.span.className = 'eSM';
          let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
          EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.String, indexPosition - cursor.indexColumn + w.indexColumn_Sum, original_span_textContent_length);
          shouldPreserveCssClassWhenSplittingAmongLine = true;
        }
        break;
      case 'eSM':
        shouldPreserveCssClassWhenSplittingAmongLine = true;
        break;
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_indentMore(cursor) {
  // You need to batch these edits so that if they hold down the tab key, you don't modify the underlying bytes of the text until the edit is finalized.
  // This function (and the 'less' version) are somewhat spahetti-code-y.
  // So make a "TOC", where you list out the main ideas, each main idea being a single line comment that starts with '#'
  // Do not overthink each individual main idea, you can easily change them as needed as you go, just start trying to make sense of things.

  // I think "TOC" has 18 lines of text I tried counting it
  // TOC:
  // ====
  // # Small and large selection positions
  // # Determine the starting indexLine (the start is the large position, this confused me for a moment)
  // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
  // # Update the 'START POSITIONS specifically' of the tracked syntax list by the total count of text that will be inserted.
  // # Descending lineIndex loop:
  //     # Insert the text on the respective line.
  //     # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
  //     # There's a second modification to the start positions of the tracked syntax list
  //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
  //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
  //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
  //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
  // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
  // # Update the cursor's selection to reflect the inserted text
  // # Update the cursor's indexColumn to reflect the inserted text
  // # Update the cursor's selection to reflect the inserted text
  // # Draw the cursor
  // # Redraw the entire viewport (I didn't even think about this... this should change)

  // Some of the ideas that I listed are vague.
  // Likely I have that wording because even I can't remember what was going on.
  //
  // For example "you immediately know the trackedSyntax that encompasses the insertion (if it exists)"
  // I can't remember why this works but I remember that it does.
  // So I need to figure out why it works.

  // # Small and large selection positions
  let SMALL_pos;
  let LARGE_pos;
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    SMALL_pos = cursor.selectionAnchor;
    LARGE_pos = cursor.selectionEnd;
  } else {
    SMALL_pos = cursor.selectionEnd;
    LARGE_pos = cursor.selectionAnchor;
  }
  let SMALL_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(SMALL_pos);
  let LARGE_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(LARGE_pos);

  // # Determine the starting indexLine (the start is the large position, this confused me for a moment)
  let startingIndex = LARGE_lineAndColumnIndices.indexLine;
  let startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
  if (startingLinePos.start === LARGE_pos) {
    startingIndex -= 1;
    if (startingIndex >= 0) {
      startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
    }
  }
  if (startingIndex < SMALL_lineAndColumnIndices.indexLine) {
    return;
  }

  // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
  let ORIGINAL_incrementBy = (startingIndex + 1 - SMALL_lineAndColumnIndices.indexLine) * 4;
  EDITOR_int_fields[25] = ORIGINAL_incrementBy;
  EDITOR_int_fields[26] = SMALL_lineAndColumnIndices.indexLine;
  EDITOR_int_fields[27] = startingIndex;
  let incrementBy = ORIGINAL_incrementBy;

  // # Update the 'START POSITIONS specifically' of the tracked syntax list by the total count of text that will be inserted.
  let trackedSyntaxReposition_i = EDITOR_trackedSyntaxReposition_find(startingLinePos.end + 1);
  if (trackedSyntaxReposition_i === NaN || trackedSyntaxReposition_i === -1) {
    trackedSyntaxReposition_i = EDITOR_trackedSyntaxList.count_abstract;
  }
  for (var i = trackedSyntaxReposition_i; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
    EDITOR_trackedSyntaxList.setStart(i, EDITOR_trackedSyntaxList.getStart(i) + ORIGINAL_incrementBy);
  }
  trackedSyntaxReposition_i--;

  // TODO: Consider having this string available rather than making it everytime this function is invoked.
  let EDITOR_on_tab_string = '';
  for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
    EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
  }

  // # Descending lineIndex loop:
  //     # Insert the text on the respective line.
  //     # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
  //     # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
  //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
  //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
  //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
  //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
  for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices.indexLine; lineI--) {
    let linePos = EDITOR_getLineBoundaryPositions(lineI);
    for (; trackedSyntaxReposition_i >= 0; trackedSyntaxReposition_i--) {
      let start = EDITOR_trackedSyntaxList.getStart(trackedSyntaxReposition_i);
      if (linePos.start <= start) {
        // # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
        EDITOR_trackedSyntaxList.setStart(trackedSyntaxReposition_i, start + incrementBy);
      } else {
        break;
      }
    }
    EDITOR_trackedSyntaxList.getElementAt(trackedSyntaxReposition_i);
    if (linePos.start > EDITOR_int_fields[30] && linePos.start < EDITOR_int_fields[30] + EDITOR_int_fields[31]) {
      // # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
      EDITOR_trackedSyntaxList.setLength(trackedSyntaxReposition_i, EDITOR_int_fields[31] + 4);
    }

    // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    incrementBy -= 4;

    // Draw the line to reflect the edit, if it is being currently shown on screen.
    let indexLine_VirtualRelative = lineI + EDITOR_int_fields[13] - EDITOR_int_fields[8];
    if (lineI < EDITOR_lineEndPositionList.count && indexLine_VirtualRelative < EDITOR_baseElement.children[4].children[2].children.length && indexLine_VirtualRelative >= 0) {
      let div = EDITOR_baseElement.children[4].children[2].children[indexLine_VirtualRelative];
      let span;
      if (div.children[0].className === '') {
        span = div.children[0];
      } else {
        span = document.createElement('span');
        div.insertBefore(span, div.children[0]);
      }
      if (span.innerText.length > 0 && (span.innerText[0] === ' ' || span.innerText[0] === '\t' || span.innerText[0] === '\0') && (span.innerText[span.innerText.length - 1] === ' ' || span.innerText[span.innerText.length - 1] === '\t' || span.innerText[span.innerText.length - 1] === '\0')) {
        span.innerText += EDITOR_on_tab_string;
      } else {
        span.innerText = EDITOR_on_tab_string + span.innerText;
      }
    }
  }

  // # Update the cursor's selection to reflect the inserted text
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    cursor.selectionEnd += ORIGINAL_incrementBy;
  } else {
    cursor.selectionAnchor += ORIGINAL_incrementBy;
  }

  // # Update the cursor's indexColumn to reflect the inserted text
  cursor.indexColumn += 4;

  // # Update the cursor's selection to reflect the inserted text
  let smallLinePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
  if (SMALL_pos > smallLinePos.start) {
    if (cursor.selectionAnchor < cursor.selectionEnd) {
      cursor.selectionAnchor += 4;
    } else {
      cursor.selectionEnd += 4;
    }
  }

  // # Draw the cursor
  EDITOR_createStyleForSelection_indentMore(cursor);
  EDITOR_drawCursor(cursor);
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_indentLess(cursor) {
  /////////////////////// P_1
  let textSelectionDiv;
  if (cursor.selectionDivExists) {
    for (var i = 0; i < EDITOR_baseElement.children[4].children[0].children.length; i++) {
      if (EDITOR_baseElement.children[4].children[0].children[i].id === cursor.htmlId) {
        textSelectionDiv = EDITOR_baseElement.children[4].children[0].children[i];
        break;
      }
    }
  } else {
    // TODO: Silent error confusing bad idea
  }
  let lesstraWidth_1 = 1 * EDITOR_characterWidth;
  let lesstraWidth_2 = 2 * EDITOR_characterWidth;
  let lesstraWidth_3 = 3 * EDITOR_characterWidth;
  let lesstraWidth_4 = 4 * EDITOR_characterWidth;
  /////////////////////// P_1

  // selection positions
  let SMALL_pos;
  let LARGE_pos;
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    SMALL_pos = cursor.selectionAnchor;
    LARGE_pos = cursor.selectionEnd;
  } else {
    SMALL_pos = cursor.selectionEnd;
    LARGE_pos = cursor.selectionAnchor;
  }
  let SMALL_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(SMALL_pos);
  let LARGE_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(LARGE_pos);

  // starting index
  let startingIndex = LARGE_lineAndColumnIndices.indexLine;
  let startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
  if (startingLinePos.start === LARGE_pos) {
    startingIndex -= 1;
    if (startingIndex >= 0) {
      startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
    }
  }
  if (startingIndex < SMALL_lineAndColumnIndices.indexLine) {
    return;
  }

  // loop over the lines to sum the "amount" of whitespace being removed
  let DETERMINE_decrementBy = 0;
  for (var lineI = SMALL_lineAndColumnIndices.indexLine; lineI <= startingIndex; lineI++) {
    let linePos = EDITOR_getLineBoundaryPositions(lineI);
    let line = linePos;
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
    let upperLimitIndexColumn;
    if (lastValidIndexColumn > 4) {
      upperLimitIndexColumn = 4;
    } else {
      upperLimitIndexColumn = lastValidIndexColumn;
    }
    let seenSpace = false;
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
      let c = getCharacter(line.start + i);
      switch (c) {
        case ' ':
          seenSpace = true;
          DETERMINE_decrementBy++;
          break;
        case '\t':
          if (!seenSpace) {
            DETERMINE_decrementBy += 4;
          }
          break outer;
        default:
          break outer;
      }
    }
  }

  // Remember the total whitespace removed
  let ORIGINAL_decrementBy = DETERMINE_decrementBy;
  EDITOR_int_fields[25] = ORIGINAL_decrementBy;
  EDITOR_int_fields[26] = SMALL_lineAndColumnIndices.indexLine;
  EDITOR_int_fields[27] = startingIndex;
  let decrementBy = ORIGINAL_decrementBy;

  // TODO: use better formatting
  // TODO: This handles the line that the small-selection-position resides on?
  {
    let linePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
    let line = linePos;
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(SMALL_lineAndColumnIndices.indexLine);
    let upperLimitIndexColumn;
    if (lastValidIndexColumn > 4) {
      upperLimitIndexColumn = 4;
    } else {
      upperLimitIndexColumn = lastValidIndexColumn;
    }
    let seenSpace = false;
    let count = 0;
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
      let c = getCharacter(line.start + i);
      switch (c) {
        case ' ':
          seenSpace = true;
          count++;
          break;
        case '\t':
          if (!seenSpace) {
            count += 4;
          }
          break outer;
        default:
          break outer;
      }
    }
    let smallLinePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
    if (SMALL_pos > smallLinePos.start) {
      if (cursor.selectionAnchor < cursor.selectionEnd) {
        cursor.selectionAnchor -= count;
      } else {
        cursor.selectionEnd -= count;
      }
    }
    if (cursor.indexLine === SMALL_lineAndColumnIndices.indexLine) {
      cursor.indexColumn -= count;
    }
  }

  // TODO: This at a glance seems to not account for when the cursor is small-position-ended and large-position-anchored...
  // ...this is moving the cursor actually, maybe it is fine? but maybe it is logic that could've been done during a loop but instead you made a new one to separately do this?
  // Also, this entire function is terribly written. You seemingly hacked something together; the code doesn't feel self explanatory. Furthermore there are both a lack of comments (given the confusing nature of how this is written), and dead comments.
  if (cursor.indexLine !== SMALL_lineAndColumnIndices.indexLine) {
    let linePos = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    let line = linePos;
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
    let upperLimitIndexColumn;
    if (lastValidIndexColumn > 4) {
      upperLimitIndexColumn = 4;
    } else {
      upperLimitIndexColumn = lastValidIndexColumn;
    }
    let seenSpace = false;
    let count = 0;
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
      let c = getCharacter(line.start + i);
      switch (c) {
        case ' ':
          seenSpace = true;
          count++;
          break;
        case '\t':
          if (!seenSpace) {
            count += 4;
          }
          break outer;
        default:
          break outer;
      }
    }
    let c = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    // TODO: git blame the below todo and remind them to delete the dead code
    // TODO: Delete this dead code / use better formatting
    /*if (SMALL_pos > smallLinePos.start) {
        if (cursor.selectionAnchor < cursor.selectionEnd) {
            cursor.selectionAnchor -= count;
        }
        else {
            cursor.selectionEnd -= count;
        }
    }*/
    if (cursor.indexLine === LARGE_lineAndColumnIndices.indexLine) {
      cursor.indexColumn -= count;
    }
  }
  let trackedSyntaxReposition_i = EDITOR_trackedSyntaxReposition_find(startingLinePos.end + 1);
  if (trackedSyntaxReposition_i === NaN || trackedSyntaxReposition_i === -1) {
    trackedSyntaxReposition_i = EDITOR_trackedSyntaxList.count_abstract;
  }
  for (var i = trackedSyntaxReposition_i; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
    EDITOR_trackedSyntaxList.setStart(i, EDITOR_trackedSyntaxList.getStart(i) - ORIGINAL_decrementBy);
  }
  trackedSyntaxReposition_i--;
  let selectionLineDivIndex = 0;
  if (textSelectionDiv) {
    selectionLineDivIndex = textSelectionDiv.children.length - 1;
  }
  for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices.indexLine; lineI--) {
    let innerRemoveCount = 0;
    let linePos = EDITOR_getLineBoundaryPositions(lineI);
    let line = linePos;
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
    let upperLimitIndexColumn;
    if (lastValidIndexColumn > 4) {
      upperLimitIndexColumn = 4;
    } else {
      upperLimitIndexColumn = lastValidIndexColumn;
    }
    let seenSpace = false;
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
      let c = getCharacter(line.start + i);
      switch (c) {
        case ' ':
          seenSpace = true;
          innerRemoveCount++;
          break;
        case '\t':
          if (!seenSpace) {
            innerRemoveCount += 4;
          }
          break outer;
        default:
          break outer;
      }
    }
    for (; trackedSyntaxReposition_i >= 0; trackedSyntaxReposition_i--) {
      let start = EDITOR_trackedSyntaxList.getStart(trackedSyntaxReposition_i);
      if (linePos.start <= start) {
        EDITOR_trackedSyntaxList.setStart(trackedSyntaxReposition_i, start - decrementBy);
      } else {
        break;
      }
    }
    EDITOR_trackedSyntaxList.getElementAt(trackedSyntaxReposition_i);
    if (linePos.start > EDITOR_int_fields[30] && linePos.start < EDITOR_int_fields[30] + EDITOR_int_fields[31]) {
      EDITOR_trackedSyntaxList.setLength(trackedSyntaxReposition_i, EDITOR_int_fields[31] - innerRemoveCount);
    }
    decrementBy -= innerRemoveCount;
    /////////////////////// P_2
    // TODO: This is not entirely correct. Presumably most specifically I am referring to the first line that is selected.
    if (textSelectionDiv && innerRemoveCount >= 1 && innerRemoveCount <= 4) {
      let lineSelectionDiv = textSelectionDiv.children[selectionLineDivIndex--];
      let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
      let lesstraWidth;
      switch (innerRemoveCount) {
        case 1:
          lesstraWidth = lesstraWidth_1;
          break;
        case 2:
          lesstraWidth = lesstraWidth_2;
          break;
        case 3:
          lesstraWidth = lesstraWidth_3;
          break;
        case 4:
          lesstraWidth = lesstraWidth_4;
          break;
      }
      widthNumberValue -= lesstraWidth;
      lineSelectionDiv.style.width = widthNumberValue + 'px';
    }
    /////////////////////// P_2

    // Draw the line to reflect the edit, if it is being currently shown on screen.
    let indexLine_VirtualRelative = lineI + EDITOR_int_fields[13] - EDITOR_int_fields[8];
    if (lineI < EDITOR_lineEndPositionList.count && indexLine_VirtualRelative < EDITOR_baseElement.children[4].children[2].children.length && indexLine_VirtualRelative >= 0) {
      let div = EDITOR_baseElement.children[4].children[2].children[indexLine_VirtualRelative];
      let span = div.children[0];
      span.innerText = span.innerText.slice(innerRemoveCount);
    }
  }
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    cursor.selectionEnd -= ORIGINAL_decrementBy;
  } else {
    cursor.selectionAnchor -= ORIGINAL_decrementBy;
  }

  /////////////////////// P_3
  cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
  cursor.DRAWN_selectionEnd = cursor.selectionEnd;
  /////////////////////// P_3

  EDITOR_drawCursor(cursor);
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} content 
 */
function EDITOR_paste(cursor, content) {
  let positionIndex = EDITOR_getPositionIndex(cursor);
  cursor.editPosition = positionIndex;
  cursor.editIndexLine = cursor.indexLine;
  cursor.editIndexColumn = cursor.indexColumn;
  cursor.EDITOR_paste_clipboardContent = content;
  let w = walkLineUntilColumnIndex(cursor);
  if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
    // TODO: silent error bad
    alert('// EDITOR_paste TODO: silent error bad');
    return;
  }

  // TODO: Consider having this string available rather than making it everytime this function is invoked.
  let EDITOR_on_tab_string = '';
  for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
    EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
  }

  // for generating tabs of some count
  let stringBuilderArray = [];
  let linesInsertedCount = 0;
  let insertionLength = 0;

  /** is a 0 based index, inclusive */
  let wordStart = 0;
  let wordLength = 0;

  // Consider '\t\0\0\0'
  let tabLength = 0;
  let previouslyGeneratedTabString_value = null;
  let previouslyGeneratedTabString_tabLengthThatWasUsed = 0;

  // Consider '\r\n' and etc...
  let linefeedLength = 0;
  let relativeIndexLine = cursor.indexLine + EDITOR_int_fields[13] - EDITOR_int_fields[8];
  let lastShownLineIndex = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
  let last_valid_indexColumn_currentLine = EDITOR_getLastValidIndexColumn(cursor.indexLine);

  // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
  // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

  let shouldPreserveCssClassWhenSplittingAmongLine = false;
  let hasSeenLinefeed = false;
  let original_indexColumn_SpanTextContentRelative = w.indexColumn_SpanTextContentRelative;
  let original_span_textContent_length = w.span.textContent.length;
  let original_tracked_syntax_start = positionIndex - cursor.indexColumn + w.indexColumn_Sum;
  for (var sourceI = 0; sourceI < content.length; sourceI++) {
    switch (content[sourceI]) {
      case '\n':
        //
        if (wordLength > 0) writeWord();else if (tabLength > 0) writeTab();
        //
        insertionLength++;
        linesInsertedCount++;
        //
        linefeedLength++;
        break;
      case '\r':
        //
        if (wordLength > 0) writeWord();else if (tabLength > 0) writeTab();
        //
        if (sourceI < content.length - 1 && content[sourceI + 1] === '\n') {
          sourceI++;
        }
        insertionLength++;
        linesInsertedCount++;
        //
        linefeedLength++;
        break;
      case '\t':
        //
        if (wordLength > 0) writeWord();else if (linefeedLength > 0) writeLinefeed();
        // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
        if (relativeIndexLine > lastShownLineIndex) return;
        //
        insertionLength += 4;
        //
        tabLength++;
        break;
      default:
        //
        if (tabLength > 0) writeTab();else if (linefeedLength > 0) writeLinefeed();
        // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
        if (relativeIndexLine > lastShownLineIndex) return;
        //
        insertionLength++;
        //
        if (wordLength === 0) {
          wordStart = sourceI;
        }
        wordLength++;
        break;
    }
  }
  if (wordLength > 0) writeWord();else if (tabLength > 0) writeTab();else if (linefeedLength > 0) writeLinefeed();
  EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(positionIndex, insertionLength);
  if (linesInsertedCount > 0) {
    update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + linesInsertedCount);
    // I uncommented this, it isn't doing what I want it to.
    // I'm just gonna be done for now.
    //EDITOR_drawGutter_Width();
  }
  function writeWord() {
    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + content.substring(wordStart, wordStart + wordLength) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
    cursor.indexColumn += wordLength;
    last_valid_indexColumn_currentLine += wordLength;
    w.indexColumn_SpanTextContentRelative += wordLength;
    wordStart = 0;
    wordLength = 0;
  }
  function writeTab() {
    if (previouslyGeneratedTabString_tabLengthThatWasUsed !== tabLength) {
      for (let i = 0; i < tabLength; i++) {
        stringBuilderArray.push(EDITOR_on_tab_string);
      }
      previouslyGeneratedTabString_value = stringBuilderArray.join('');
      previouslyGeneratedTabString_tabLengthThatWasUsed = tabLength;
      stringBuilderArray.length = 0;
    }
    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + previouslyGeneratedTabString_value + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
    let thisInsertionLength = 4 * tabLength;
    cursor.indexColumn += thisInsertionLength;
    last_valid_indexColumn_currentLine += thisInsertionLength;
    w.indexColumn_SpanTextContentRelative += thisInsertionLength;
    tabLength = 0;
  }

  /**
   * TODO: If this ends up working don't duplicate this code, this is the 'EDITOR_EnterKey' function; copy, paste, and probably modified.
   */
  function writeLinefeed() {
    if (!hasSeenLinefeed) {
      handleNotHasSeenLinefeed();
    }

    // TODO: this is a very lazy solution to the problem, likely a more optimal way is available. Also name the variable?
    // I don't think everything fully works but I'm trying to decide if I should go eat something.
    for (let handleLineCounter = 0; handleLineCounter < linefeedLength; handleLineCounter++) {
      if (relativeIndexLine > lastShownLineIndex) {
        // A scroll should take place and handle the rest
        // Note: any lines indices that don't change between the current scrollTop and what is shown with the new scrollTop...
        // ...won't redraw so you still need to run this code for some of the lines.
        // you could probably predict which lines in particular overlap or some such but it isn't being done here currently.
        break;
      }
      let lineDiv; // TODO: re-use the one you are removing?
      let removingVisuallyDiv;
      if (cursor.indexColumn === 0 && last_valid_indexColumn_currentLine !== 0) {
        // start of line
        if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
          if (relativeIndexLine === 0) {
            lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
            removingVisuallyDiv = null; // No div above you to remove
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
          }
        } else {
          lineDiv = EDITOR_getNewAndEmptyLineElement();
          removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
        }
        if (lineDiv) {
          EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine]);
          EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
          w.div = lineDiv;
          w.indexSpan = 0;
          w.span = lineDiv.children[w.indexSpan];
          w.indexColumn_Goal = 0;
          w.indexColumn_Sum = 0;
          w.indexColumn_SpanTextContentRelative = 0;
          cursor.indexLine++;
          cursor.indexColumn = 0;
          relativeIndexLine++;
        }
        continue;
      } else {
        // ensure this conditional branch continues if handled, otherwise it will execute the fallback case erroneously
        if (last_valid_indexColumn_currentLine === cursor.indexColumn) {
          // end of line
          if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
            if (relativeIndexLine === 0) {
              lineDiv = null;
              removingVisuallyDiv = null; // No div above you to remove
            } else {
              lineDiv = EDITOR_getNewAndEmptyLineElement();
              removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
            }
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
          }
          if (lineDiv) {
            // TODO: this is wrong you don't need to remove a div, just use that div again instead of making a new one to replace it.
            EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
            EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
            w.div = lineDiv;
            w.indexSpan = 0;
            w.span = lineDiv.children[w.indexSpan];
            w.indexColumn_Goal = 0;
            w.indexColumn_Sum = 0;
            w.indexColumn_SpanTextContentRelative = 0;
            cursor.indexLine++;
            cursor.indexColumn = 0;
            last_valid_indexColumn_currentLine = 0;
            relativeIndexLine++;
          }
          continue;
        } else {
          // among a line
          // This case can only happen once at the start of the edit
          if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
            if (relativeIndexLine === 0) {
              lineDiv = null;
              removingVisuallyDiv = null; // No div above you to remove
            } else {
              lineDiv = EDITOR_getNewAndEmptyLineElement();
              removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
            }
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
          }
          if (lineDiv) {
            if (w.indexColumn_Goal > 0) {
              if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
                let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
                let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
                last_valid_indexColumn_currentLine = lastText.length;
                w.span.innerText = firstText;
                if (shouldPreserveCssClassWhenSplittingAmongLine) {
                  lineDiv.children[0].className = w.span.className;
                  lineDiv.children[0].innerText += lastText;
                } else {
                  // TODO: don't create a span here, the div already has one available that isn't being used...
                  // ...although that's only because you are creating a new div, if you fix that which is on its own a separate issue
                  // then maybe this... I think it would still have at least 1 empty span though?
                  //
                  let span = document.createElement('span');
                  span.innerText = lastText;
                  lineDiv.appendChild(span);
                }
              }
              let rememberIndex = w.indexSpan + 1;
              let rememberLength = w.div.children.length;
              for (let i = rememberIndex; i < rememberLength; i++) {
                lineDiv.appendChild(w.div.children[rememberIndex]);
              }
            }
            EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
            EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
            w.div = lineDiv;
            w.indexSpan = 0;
            w.span = lineDiv.children[w.indexSpan];
            w.indexColumn_Goal = 0;
            w.indexColumn_Sum = 0;
            w.indexColumn_SpanTextContentRelative = 0;
            cursor.indexLine++;
            cursor.indexColumn = 0;
            // last_valid_indexColumn_currentLine is being set when splitting the text.
            relativeIndexLine++;
          }
          continue;
        }
      }
    }
    linefeedLength = 0;
  }
  function handleNotHasSeenLinefeed() {
    // The only way to invoke this is if you encountered a linefeed for the first time,
    // therefore 'w.span' is the original span and no variable for the original needs to be made.
    // (unless in the future you don't end up using the w.span in some way or etc...)
    //
    hasSeenLinefeed = true;
    switch (w.span.className) {
      case 'eCm':
        if (original_indexColumn_SpanTextContentRelative >= 2 && original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 2) {
          w.span.className = 'eCM';
          let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
          EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.Comment, indexPosition - cursor.indexColumn + w.indexColumn_Sum, original_span_textContent_length);
          shouldPreserveCssClassWhenSplittingAmongLine = true;
        }
        break;
      case 'eCM':
        shouldPreserveCssClassWhenSplittingAmongLine = true;
        break;
      case 'eSm':
        if (original_indexColumn_SpanTextContentRelative >= 1 && original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 1) {
          w.span.className = 'eSM';
          let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
          EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.String, indexPosition - cursor.indexColumn + w.indexColumn_Sum, original_span_textContent_length);
          shouldPreserveCssClassWhenSplittingAmongLine = true;
        }
        break;
      case 'eSM':
        shouldPreserveCssClassWhenSplittingAmongLine = true;
        break;
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_tabKey(cursor) {
  let indexPosition = EDITOR_getPositionIndex(cursor);
  cursor.editPosition = indexPosition;
  cursor.editIndexLine = cursor.indexLine;
  cursor.editIndexColumn = cursor.indexColumn;
  EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, 4);
  let w = walkLineUntilColumnIndex(cursor);
  cursor.indexColumn += 4; // this has to come after the 'let w = ...'

  if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
    // TODO: silent error bad
    return;
  }

  // TODO: Consider having this string available rather than making it everytime this function is invoked.
  let EDITOR_on_tab_string = '';
  for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
    EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
  }
  w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + EDITOR_on_tab_string + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns the COLUMN index that exclusively ends the indentation.
 */
function EDITOR_findEndExclusiveIndentationIndexColumn(cursor) {
  let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
  let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
  for (var i = 0; i < lastValidIndexColumn; i++) {
    let c = getCharacter(line.start + i);
    switch (c) {
      case ' ':
      case '\t':
      case '\0':
        // tabs are stored as: '\t\0\0\0'
        break;
      default:
        return i;
    }
  }
  return 0;
}

/**
 * If a line has an indentation of 4 space characters, but the user's cursor is positioned after the second space character,
 * then only the first 2 space characters will be used as indentation.
 * 
 * This is intentional, it seems like the more expected behavior in my mind.
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_cacheIndentation(cursor) {
  cursor.cached_indentation_byteList = new ByteList(32);
  let indentationBuilder = [];
  let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
  let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
  let upperLimitIndexColumn;
  if (lastValidIndexColumn > cursor.indexColumn) {
    upperLimitIndexColumn = cursor.indexColumn;
  } else {
    upperLimitIndexColumn = lastValidIndexColumn;
  }
  outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
    let c = getCharacter(line.start + i);
    switch (c) {
      case ' ':
        cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, ASCII_SPACE);
        indentationBuilder.push(c);
        break;
      case '\t':
        cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, ASCII_TAB);
        indentationBuilder.push(c);
        break;
      case '\0':
        // tabs are stored as: '\t\0\0\0'
        cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, 0);
        indentationBuilder.push(c);
        break;
      default:
        break outer;
    }
  }
  cursor.cached_indentation_string = indentationBuilder.join('');
}
function EDITOR_lineWasInsertedValidateGutter() {
  if (EDITOR_baseElement.children[3].children[0].children.length > 0 && EDITOR_baseElement.children[3].children[0].children.length === EDITOR_int_fields[9]) {
    if (EDITOR_baseElement.children[3].children[0].children[EDITOR_baseElement.children[3].children[0].children.length - 1].innerText === '~') {
      let successFoundTildeAtIndex = EDITOR_baseElement.children[3].children[0].children.length - 1;
      for (let i = EDITOR_baseElement.children[3].children[0].children.length - 2; i >= 0; i--) {
        if (EDITOR_baseElement.children[3].children[0].children[i].innerText === '~') {
          successFoundTildeAtIndex = i;
        } else {
          successFoundTildeAtIndex = i + 1;
          break;
        }
      }
      if (successFoundTildeAtIndex > 0) {
        let number = parseInt(EDITOR_baseElement.children[3].children[0].children[successFoundTildeAtIndex - 1].innerText);
        EDITOR_baseElement.children[3].children[0].children[successFoundTildeAtIndex].innerText = number + 1;
      }
    }
  }
  EDITOR_drawGutter_Width();
}

/**
 * TODO: This uses a linear search and likely can be optimized.
 * 
 * @param {*} indexPosition 
 * @param {*} insertionCount 
 */
function EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount) {
  for (var i = 0; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
    EDITOR_trackedSyntaxList.getElementAt(i);
    if (indexPosition <= EDITOR_int_fields[30]) {
      EDITOR_trackedSyntaxList.setStart(i, EDITOR_int_fields[30] + insertionCount);
    } else if (indexPosition > EDITOR_int_fields[30] && indexPosition < EDITOR_int_fields[30] + EDITOR_int_fields[31]) {
      EDITOR_trackedSyntaxList.setLength(i, EDITOR_int_fields[31] + insertionCount);
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {boolean} ctrlKey 
 * @param {boolean} shiftKey 
 * @returns 
 */
function EDITOR_EnterKey(cursor, ctrlKey, shiftKey) {
  if (!cursor.cached_indentation_byteList) EDITOR_cacheIndentation(cursor);
  if (ctrlKey) cursor.indexColumn = 0;else if (shiftKey) cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
  update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + 1);
  let indexPosition = EDITOR_getPositionIndex_raw(cursor);
  cursor.editPosition = indexPosition;
  cursor.editIndexLine = cursor.indexLine;
  cursor.editIndexColumn = cursor.indexColumn;
  let relativeIndexLine = cursor.indexLine + EDITOR_int_fields[13] - EDITOR_int_fields[8];
  let insertionCount = 1;
  let shouldRenderEntireViewport = false;
  if (relativeIndexLine >= EDITOR_baseElement.children[4].children[2].children.length || relativeIndexLine < 0) shouldRenderEntireViewport = true;

  // There are some cases that I don't feel like thinking about at the moment, this if statement singles them out.
  if (EDITOR_int_fields[9] <= 1 || EDITOR_baseElement.children[4].children[2].children.length !== EDITOR_int_fields[9]) shouldRenderEntireViewport = true;

  // TODO: reminder for when virtualization padding is improved, this function might need to be looked at.
  // TODO: Track the enter keystroke the same as any other insertion edit and have it pending until it needs to be finalized.

  // 4 cases:
  // - "start of line":
  // - "end of line":
  // - "among a line":
  // - "fallback case": this last case is a fallback case and redraws the entire viewport in the case that the UI is in an "unpredictable state" and cannot be optimally redrawn in a smaller more specific redraw.

  // TODO: I'm not gonna put this on the fallback case, 'EDITOR_lineWasInsertedValidateGutter()'...
  // ...just cause it is different and I have a weird vibe but I'm too tired to investigate right now.
  // and it is gonna mess me up at some point cause the invocation does the longest line number drawing

  if (!shouldRenderEntireViewport && cursor.indexColumn === 0) {
    // start of line
    cursor.enterKeyEventKind = 1;
    let lineDiv; // TODO: re-use the one you are removing?
    let removingVisuallyDiv;
    if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
      if (relativeIndexLine === 0) {
        lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
        removingVisuallyDiv = null; // No div above you to remove
      } else {
        lineDiv = EDITOR_getNewAndEmptyLineElement();
        removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
      }
    } else {
      lineDiv = EDITOR_getNewAndEmptyLineElement();
      removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
    }
    if (lineDiv) {
      EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine]);
      EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
    }
    if (cursor.cached_indentation_byteList) {
      insertionCount += cursor.cached_indentation_byteList.count;
    }
    EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);
    if (ctrlKey) {
      cursor.indexColumn = insertionCount - 1;
    } else {
      cursor.indexLine++;
      cursor.indexColumn = insertionCount - 1;
    }
    EDITOR_lineWasInsertedValidateGutter();
    cursor.editLength = insertionCount;
    return;
  } else {
    if (!shouldRenderEntireViewport) {
      // ensure this conditional branch returns if handled, otherwise it will execute the fallback case erroneously

      let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
      if (lastValidIndexColumn === cursor.indexColumn) {
        // end of line
        cursor.enterKeyEventKind = 2;
        let lineDiv;
        let removingVisuallyDiv;
        if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
          if (relativeIndexLine === 0) {
            lineDiv = null;
            removingVisuallyDiv = null; // No div above you to remove
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
          }
        } else {
          lineDiv = EDITOR_getNewAndEmptyLineElement();
          removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
        }
        if (lineDiv) {
          lineDiv.children[0].innerText = cursor.cached_indentation_string;
          EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
          EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
        }
        if (cursor.cached_indentation_byteList) {
          insertionCount += cursor.cached_indentation_byteList.count;
        }
        EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);
        cursor.indexLine++;
        cursor.indexColumn = insertionCount - 1;
        EDITOR_lineWasInsertedValidateGutter();
        cursor.editLength = insertionCount;
        return;
      } else {
        // among a line
        cursor.enterKeyEventKind = 3;
        let lineDiv;
        let removingVisuallyDiv;
        if (relativeIndexLine === EDITOR_int_fields[9] - 1) {
          if (relativeIndexLine === 0) {
            lineDiv = null;
            removingVisuallyDiv = null; // No div above you to remove
          } else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[0];
          }
        } else {
          lineDiv = EDITOR_getNewAndEmptyLineElement();
          removingVisuallyDiv = EDITOR_baseElement.children[4].children[2].children[EDITOR_int_fields[9] - 1];
        }
        if (lineDiv) {
          lineDiv.children[0].innerText = cursor.cached_indentation_string;
          let w = walkLineUntilColumnIndex(cursor);
          let shouldPreserveCssClassWhenSplittingAmongLine = false;
          if (!ctrlKey && !shiftKey) {
            // Is this '!ctrlKey && !shiftKey' check redundant? I feel like this conditional branch would never be reached regardless.
            switch (w.span.className) {
              case 'eCm':
                if (w.indexColumn_SpanTextContentRelative >= 2 && w.indexColumn_SpanTextContentRelative <= w.span.textContent.length - 2) {
                  w.span.className = 'eCM';
                  let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                  EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.Comment, indexPosition - cursor.indexColumn + w.indexColumn_Sum, w.span.textContent.length);
                  shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
              case 'eCM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
              case 'eSm':
                if (w.indexColumn_SpanTextContentRelative >= 1 && w.indexColumn_SpanTextContentRelative <= w.span.textContent.length - 1) {
                  w.span.className = 'eSM';
                  let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                  EDITOR_trackedSyntaxList.insert(indexOfGreaterThanOrEqual, TrackedSyntaxKind.String, indexPosition - cursor.indexColumn + w.indexColumn_Sum, w.span.textContent.length);
                  shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
              case 'eSM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
            }
          }
          if (w.indexColumn_Goal > 0) {
            if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
              let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
              let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
              w.span.innerText = firstText;
              if (shouldPreserveCssClassWhenSplittingAmongLine) {
                lineDiv.children[0].className = w.span.className;
                lineDiv.children[0].innerText += lastText;
              } else {
                let span = document.createElement('span');
                span.innerText = lastText;
                lineDiv.appendChild(span);
              }
            }
            let rememberIndex = w.indexSpan + 1;
            let rememberLength = w.div.children.length;
            for (let i = rememberIndex; i < rememberLength; i++) {
              lineDiv.appendChild(w.div.children[rememberIndex]);
            }
          }
          EDITOR_baseElement.children[4].children[2].insertBefore(lineDiv, EDITOR_baseElement.children[4].children[2].children[relativeIndexLine + 1]);
          EDITOR_baseElement.children[4].children[2].removeChild(removingVisuallyDiv);
        }
        if (cursor.cached_indentation_byteList) {
          insertionCount += cursor.cached_indentation_byteList.count;
        }
        EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);
        cursor.indexLine++;
        cursor.indexColumn = insertionCount - 1;
        EDITOR_lineWasInsertedValidateGutter();
        cursor.editLength = insertionCount;
        return;
      }
    }

    // TODO: You cannot do the fallback case anywhere because it relies on the edit being finalized.

    // fallback case
    cursor.enterKeyEventKind = 4;

    // fallback to inefficient viewport redraw if previous cases can't optimally render
    if (cursor.cached_indentation_byteList) {
      insertionCount += cursor.cached_indentation_byteList.count;
    }

    // TODO: I don't know how to test this one. This trackedSyntax repositioning in this case, a before and after of it working never was observed...
    // ...this is the same solution used elsewhere and it seems like it would work if I could replicate this case. I think I need a very small window height???
    //
    EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);
    cursor.indexLine++;
    cursor.indexColumn = insertionCount - 1;
    cursor.editLength = insertionCount;
    alert('get_EnterKeyEventKind_FallbackCase()');
  }
}
function EDITOR_onResize_WRAPIT() {
  const timeoutFunc = () => {
    if (/*trailing && lastArgs*/EDITOR_onResize_bool) {
      EDITOR_onResize();
      EDITOR_onResize_bool = false;
      EDITOR_onResize_timer = setTimeout(timeoutFunc, 200);
    } else {
      EDITOR_onResize_timer = null;
    }
  };
  EDITOR_onResize_bool = true;
  if (!EDITOR_onResize_timer) {
    EDITOR_onResize_timer = setTimeout(timeoutFunc, 200);
  }
}
function EDITOR_onResize() {
  EDITOR_byte_fields[1] = 1;
  let remember_virtualCount = EDITOR_int_fields[9];
  update_virtualCount();
  if (EDITOR_int_fields[9] !== remember_virtualCount) {
    update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + 1);
    EDITOR_onScroll();
    // # Redraw cursor selection virtualization
    // Code Duplication: # Redraw cursor selection virtualization... TODO: This is using 'EDITOR_primaryCursor' rather than 'EDITOR_cursorList[i]' so it is surely incorrect?
    for (let i = 0; i < EDITOR_cursorList.length; i++) {
      EDITOR_createStyleForSelection(EDITOR_primaryCursor);
    }
  }
  EDITOR_drawHorizontalScrollbar();
}

/**
 * You need to change this logic to know the longest line.
 * Then when the longest line changes or some such likely related to finalization of an edit (not pending edits).
 * then at that point you redraw this.
 */
function EDITOR_drawHorizontalScrollbar() {
  if (EDITOR_baseElement.children[2].children[0].style.left !== EDITOR_baseElement.children[4].style.marginLeft) {
    EDITOR_baseElement.children[2].children[0].style.left = EDITOR_baseElement.children[4].style.marginLeft;
  }
  if (EDITOR_horizontal_scrollbar_widthValue !== EDITOR_baseElement.clientWidth - EDITOR_int_fields[7]) {
    EDITOR_horizontal_scrollbar_widthValue = EDITOR_baseElement.clientWidth - EDITOR_int_fields[7];
    EDITOR_baseElement.children[2].children[0].style.width = EDITOR_horizontal_scrollbar_widthValue + 'px';
  }
  if (EDITOR_int_fields[22] !== EDITOR_int_fields[23]) {
    EDITOR_int_fields[23] = EDITOR_int_fields[22];
    EDITOR_int_fields[24] = Math.ceil(EDITOR_int_fields[22] * EDITOR_characterWidth);
    EDITOR_baseElement.children[2].children[0].children[0].style.width = EDITOR_int_fields[24] + 'px';
    EDITOR_baseElement.children[0].style.width = EDITOR_int_fields[24] + EDITOR_int_fields[7] + 'px';
  }

  // TODO: this is directly tied to a scroll event on EDITOR_baseElement so handle it from there perhaps?
  // TODO: this code is duplicated inside EDITOR_onScroll when it returns early due to nothing vertically having changed, reduce duplication?
  if (EDITOR_baseElement.children[2].children[0].scrollLeft !== EDITOR_baseElement.scrollLeft) {
    EDITOR_baseElement.children[2].children[0].scrollLeft = EDITOR_baseElement.scrollLeft;
  }
}
function EDITOR_onScroll_WRAPIT() {
  EDITOR_byte_fields[8] = true;
  if (!EDITOR_timer) {
    if (true /*options.leading*/) {
      EDITOR_onScroll();
    }
    EDITOR_timer = setTimeout(EDITOR_onScroll_timeoutFunc, 100);
  }
}
function EDITOR_onScroll_timeoutFunc() {
  if (/*trailing && lastArgs*/EDITOR_byte_fields[8]) {
    EDITOR_byte_fields[8] = false;
    EDITOR_onScroll();
    EDITOR_timer = setTimeout(EDITOR_onScroll_timeoutFunc, 100);
  } else {
    EDITOR_timer = null;
    // Code Duplication: # Redraw cursor selection virtualization... TODO: This is using 'EDITOR_primaryCursor' rather than 'EDITOR_cursorList[i]' so it is surely incorrect?
    for (let i = 0; i < EDITOR_cursorList.length; i++) {
      EDITOR_createStyleForSelection(EDITOR_primaryCursor);
    }
  }
}

/**
 * TODO: Too many verbose comments that are just ramblings
 */
function EDITOR_onScroll() {
  EDITOR_finalizeAllCursors();
  update_VirtualLineIndex();
  if (EDITOR_int_fields[20] === EDITOR_baseElement.scrollTop && EDITOR_int_fields[18] === EDITOR_int_fields[8] && EDITOR_int_fields[19] === EDITOR_int_fields[9]) {
    // TODO: this is directly tied to a scroll event on EDITOR_baseElement so handle it from there perhaps?
    // TODO: this code is duplicated inside EDITOR_drawHorizontalScrollbar, reduce duplication?
    if (EDITOR_baseElement.children[2].children[0].scrollLeft !== EDITOR_baseElement.scrollLeft) {
      EDITOR_baseElement.children[2].children[0].scrollLeft = EDITOR_baseElement.scrollLeft;
    }
    return;
  }
  EDITOR_int_fields[20] = EDITOR_baseElement.scrollTop;

  // If I delay setting 'set_EDITOR_ONSCROLLvirtualLineIndex()' then I can just use that.
  // I can't bear to do that right now though. I'm just gonna make this variable.
  let prevVli = EDITOR_int_fields[18];
  let currVli = EDITOR_int_fields[8];
  EDITOR_int_fields[18] = EDITOR_int_fields[8];
  if (EDITOR_int_fields[19] !== EDITOR_int_fields[9] || EDITOR_baseElement.children[3].children[0].children.length !== EDITOR_int_fields[9] || EDITOR_baseElement.children[4].children[2].children.length !== EDITOR_int_fields[9]) {
    // Force case 3
    prevVli = 0;
    currVli = EDITOR_int_fields[9];
    EDITOR_createViewport();
  }
  if (EDITOR_int_fields[19] === EDITOR_int_fields[9] && EDITOR_baseElement.children[3].children[0].children.length === EDITOR_int_fields[9] && EDITOR_baseElement.children[4].children[2].children.length === EDITOR_int_fields[9]) {
    // The same count of lines is on the UI so you can probably
    // redraw them one by one and save "some" of the existing HTML.

    let diff = currVli - prevVli;
    let onePositiveDiff_twoNegativeDiff_orThreeFullScreen;
    let trackedSyntax_I;
    let lowerBound;
    let upperBound;
    let loopCounter = 0;
    let baseIndex;
    if (diff > 0 && diff < EDITOR_int_fields[9]) {
      onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 1;
      // firstIndexLineThatWasNotAlreadyRendered
      trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(prevVli + EDITOR_int_fields[19]);
      lowerBound = prevVli + EDITOR_int_fields[19];
      upperBound = lowerBound + diff;
      baseIndex = 0;
    } else if (diff < 0 && (diff *= -1) < EDITOR_int_fields[9]) {
      onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 2;
      trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(currVli);
      lowerBound = currVli;
      upperBound = lowerBound + diff;
      baseIndex = EDITOR_baseElement.children[3].children[0].children.length - 1;
    } else {
      onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 3;
      trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(EDITOR_int_fields[8]);
      lowerBound = EDITOR_int_fields[8];
      upperBound = lowerBound + EDITOR_int_fields[9];
      // case 3 sets baseIndex each loop but this is useful so the variable is initialized.
      baseIndex = 0;
    }
    if (trackedSyntax_I === NaN || trackedSyntax_I === -1) {
      trackedSyntax_I = EDITOR_trackedSyntaxList.count_abstract;
    }
    for (var indexLine = lowerBound; indexLine < upperBound; indexLine++) {
      let div;
      switch (onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
        case 1:
          // EDITOR_drawGutter_Content()
          if (indexLine >= EDITOR_lineEndPositionList.count) {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = '~';
          } else {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = indexLine + 1;
          }
          EDITOR_baseElement.children[3].children[0].appendChild(EDITOR_baseElement.children[3].children[0].children[baseIndex]);
          div = EDITOR_baseElement.children[4].children[2].children[baseIndex];
          EDITOR_baseElement.children[4].children[2].appendChild(div);

          // case 1 doesn't use 'loopCounter'
          break;
        case 2:
          // EDITOR_drawGutter_Content()
          if (indexLine >= EDITOR_lineEndPositionList.count) {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = '~';
          } else {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = indexLine + 1;
          }
          EDITOR_baseElement.children[3].children[0].insertBefore(EDITOR_baseElement.children[3].children[0].children[baseIndex], EDITOR_baseElement.children[3].children[0].children[loopCounter]);
          div = EDITOR_baseElement.children[4].children[2].children[baseIndex];
          EDITOR_baseElement.children[4].children[2].insertBefore(div, EDITOR_baseElement.children[4].children[2].children[loopCounter]);
          loopCounter++;
          break;
        case 3:
          baseIndex = loopCounter;

          // EDITOR_drawGutter_Content()
          if (indexLine >= EDITOR_lineEndPositionList.count) {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = '~';
          } else {
            EDITOR_baseElement.children[3].children[0].children[baseIndex].innerText = indexLine + 1;
          }
          // case 3 doesn't have a step here

          div = EDITOR_baseElement.children[4].children[2].children[baseIndex];
          // case 3 doesn't have a step here

          loopCounter++;
          break;
      }
      let lineStart;
      let lineEnd;
      if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
          lineStart = 0;
          lineEnd = EDITOR_lineEndPositionList.data[indexLine] - 0;
        } else {
          lineStart = EDITOR_lineEndPositionList.data[indexLine - 1] + 1;
          lineEnd = EDITOR_lineEndPositionList.data[indexLine];
        }
      } else {
        lineStart = 0;
        lineEnd = 0;
      }
      trackedSyntax_I = EDITOR_createSpansForLineOfText(div, lineStart, lineEnd, trackedSyntax_I);
    }
    EDITOR_drawHorizontalScrollbar();
  }
}
function EDITOR_createViewport() {
  EDITOR_int_fields[19] = EDITOR_int_fields[9];
  EDITOR_baseElement.children[3].children[0].innerHTML = '';
  EDITOR_baseElement.children[4].children[2].innerHTML = '';
  let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(0 + EDITOR_int_fields[8]);
  if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
    trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
  }
  let trackedSyntax_I = trackedSyntax_StartingIndex;
  for (var i = 0; i < EDITOR_int_fields[9]; i++) {
    let indexLine = i + EDITOR_int_fields[8];

    // EDITOR_drawGutter_Content()
    let gutterLineElement = document.createElement('div');
    if (indexLine >= EDITOR_lineEndPositionList.count) {
      gutterLineElement.innerText = '~';
    } else {
      gutterLineElement.innerText = indexLine + 1;
    }
    gutterLineElement.className = 'eG';
    EDITOR_baseElement.children[3].children[0].appendChild(gutterLineElement);

    // EDITOR_drawText()
    let line = EDITOR_getLineBoundaryPositions(indexLine);
    let div = document.createElement('div');
    div.className = 'eT';
    EDITOR_baseElement.children[4].children[2].appendChild(div);
  }
  EDITOR_drawHorizontalScrollbar();
}

/**
 * If you were to make a function for this logic, it presumably would look like this.
 * I'm not sure if I like the idea of having a function for this though, given it is inside a loop, I'd want to investigate whether it has any performance impacts.
 * TODO: make a decision
 * 
 * @param line is the result from 'EDITOR_getLineBoundaryPositions(...)'
 * 
 * @returns trackedSyntax_I the index that was left off on
 */
function EDITOR_createSpansForLineOfText(div, lineStart, lineEnd, trackedSyntax_I) {
  let childIndex = 0;
  if (lineStart === lineEnd) {
    if (childIndex < div.children.length) {
      let span = div.children[childIndex++];
      span.innerText = '';
      span.className = '';
    } else {
      div.appendChild(document.createElement('span'));
      childIndex++;
    }
  } else {
    let substart = lineStart;
    for (; trackedSyntax_I < EDITOR_trackedSyntaxList.count_abstract;) {
      EDITOR_trackedSyntaxList.getElementAt(trackedSyntax_I);
      if (substart >= lineEnd) {
        break;
      }
      if (EDITOR_int_fields[30] >= lineEnd) {
        break;
      }
      if (EDITOR_int_fields[30] + EDITOR_int_fields[31] < lineStart) {
        trackedSyntax_I++;
        continue;
      }
      if (EDITOR_int_fields[30] > substart) {
        let subend = EDITOR_int_fields[30] > lineEnd ? lineEnd : EDITOR_int_fields[30]; // probably a nonsense line of code given the previous if statements
        childIndex = EDITOR_language_line_lex(div, substart, subend, childIndex);
        substart += subend - substart;
      }
      {
        let span;
        if (childIndex < div.children.length) {
          span = div.children[childIndex++];
          //span.className = ''; className is guaranteed to be set in this specific case
        } else {
          span = document.createElement('span');
          div.appendChild(span);
          childIndex++;
        }
        let trackedSyntaxEnd = EDITOR_int_fields[30] + EDITOR_int_fields[31];
        let subend = trackedSyntaxEnd > lineEnd ? lineEnd : trackedSyntaxEnd;
        span.innerText = EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(substart, subend));
        substart += subend - substart;
        switch (EDITOR_pooledTrackedSyntax_trackedSyntaxKind) {
          case TrackedSyntaxKind.Comment:
            span.className = 'eCM';
            break;
          case TrackedSyntaxKind.String:
            span.className = 'eSM';
            break;
          default:
            span.className = '';
            break;
        }
      }
      if (EDITOR_int_fields[30] + EDITOR_int_fields[31] <= lineEnd) {
        trackedSyntax_I++;
        continue;
      }
      break;
    }
    if (substart < lineEnd) {
      childIndex = EDITOR_language_line_lex(div, substart, lineEnd, childIndex);
    }
  }
  let aaa = div.children.length - childIndex;
  for (let i = 0; i < aaa; i++) {
    div.removeChild(div.children[childIndex]);
  }
  return trackedSyntax_I;
}
function EDITOR_REMOVE_line_drawGutter(linesRemovedCount) {
  //EDITOR_finalizeAllCursors();

  // It's actually something about current undershoot vs overshoot incoming to undershoot or sometrhing
  // !!!!!!!!
  // it's let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
  // not what is below this line
  // todo remove this confusing and misleading commented dead code that has the or maybe I idk
  // largestDrawnIndexLine + linesRemovedCount ? EDITOR_lineEndPositionList.count

  if (EDITOR_baseElement.children[3].children[0].children.length > 0 && EDITOR_baseElement.children[3].children[0].children.length === EDITOR_int_fields[9]) {
    if (EDITOR_baseElement.children[3].children[0].children[EDITOR_baseElement.children[3].children[0].children.length - 1].innerText === '~') {
      let successFoundTildeAtIndex = EDITOR_baseElement.children[3].children[0].children.length - 1;
      for (let i = EDITOR_baseElement.children[3].children[0].children.length - 2; i >= 0; i--) {
        if (EDITOR_baseElement.children[3].children[0].children[i].innerText === '~') {
          successFoundTildeAtIndex = i;
        } else {
          successFoundTildeAtIndex = i + 1;
          break;
        }
      }
      for (var i = 0; i < linesRemovedCount; i++) {
        if (successFoundTildeAtIndex > i) {
          EDITOR_baseElement.children[3].children[0].children[successFoundTildeAtIndex - (i + 1)].innerText = '~';
        }
      }
    } else {
      // I don't have '~' in view

      // TODO: you need to check the non-selection-based-removes for bringing existing text into view via removal of a line

      let largestDrawnIndexLine = EDITOR_int_fields[8] + EDITOR_int_fields[9];
      if (largestDrawnIndexLine + linesRemovedCount >= EDITOR_lineEndPositionList.count) {
        // but I'll bring one or more into view by doing the removal
        //let bbb = largestDrawnIndexLine + linesRemovedCount - (EDITOR_lineEndPositionList.count - 1);
        //let aaa = 2;
        //let successFoundTildeAtIndex = get_EDITOR_gutter().children.length - 1;
        //for (let i = get_EDITOR_gutter().children.length - 2; i >= 0; i--) {
        //    if (get_EDITOR_gutter().children[i].innerText === '~') {
        //        successFoundTildeAtIndex = i;
        //    }
        //    else {
        //        successFoundTildeAtIndex = i + 1;
        //        break;
        //    }
        //}
        //for (var i = 0; i < bbb; i++) {
        //    if (successFoundTildeAtIndex > i) {
        //        get_EDITOR_gutter().children[successFoundTildeAtIndex - (i + 1)].innerText = '~';
        //    }
        //}
      } else {
        // but the removal will NOT bring any into view.
      }
    }
  }

  // - [ ] If you are scrolled (vertical was the specific observation, horizontal was not tested) when you open a file, it bugs out and duplicates the text visually?

  EDITOR_drawGutter_Width();
}

/**
 * TODO: This function uses 'EDITOR_getLineAndColumnIndices' but it needs to be raw.
 * 
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_removeSelection(cursor) {
  // When you do the multicursor you would need to actually keep sorted the pending line end positions

  if (cursor.editKind != 0) {
    // TODO: multicursor confusion scenario is likely to happy due to this code, but the code isn't related enough for me to change it yet.
    EDITOR_finalizeEdit(cursor);
  }
  let smallPosition;
  let largePosition;
  if (cursor.selectionAnchor < cursor.selectionEnd) {
    smallPosition = cursor.selectionAnchor;
    largePosition = cursor.selectionEnd;
  } else {
    smallPosition = cursor.selectionEnd;
    largePosition = cursor.selectionAnchor;
  }
  cursor.selectionAnchor = 0;
  cursor.selectionEnd = 0;
  let editLength = largePosition - smallPosition;
  // editLength is 0 in this ...startEdit invocation intentionally, you cannot set the editLength until the end (TODO: remember what the exact reason was and put it here... I think it was because 'EDITOR_readLineEndPositionList' function is used rather than reading directly)
  EDITOR_startEdit(cursor, 4, smallPosition, /*editLength*/0);
  let smallLineAndColumnIndices = EDITOR_getLineAndColumnIndices(smallPosition);
  cursor.indexLine = smallLineAndColumnIndices.indexLine;
  cursor.indexColumn = smallLineAndColumnIndices.indexColumn;
  cursor.editIndexLine = smallLineAndColumnIndices.indexLine;
  cursor.editIndexColumn = smallLineAndColumnIndices.indexColumn;
  let largeLineAndColumnIndices = EDITOR_getLineAndColumnIndices(largePosition);
  cursor.END_editIndexLine = largeLineAndColumnIndices.indexLine;
  cursor.END_editIndexColumn = largeLineAndColumnIndices.indexColumn;
  let indexTrackedSyntax = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(cursor.indexLine);
  if (indexTrackedSyntax === NaN || indexTrackedSyntax === -1) {
    indexTrackedSyntax = EDITOR_trackedSyntaxList.count_abstract;
  }
  let possibleTrackedSyntaxToSpanSingleLine = false;
  if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
    EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
    if (EDITOR_int_fields[30] < EDITOR_lineEndPositionList.data[cursor.indexLine]) {
      possibleTrackedSyntaxToSpanSingleLine = true;
    }
    // TODO: This has no reason to be a for loop
    for (let i = cursor.indexLine - 1; i >= 0; i--) {
      let lineEndPosition = EDITOR_lineEndPositionList.data[i];
      if (EDITOR_int_fields[30] < lineEndPosition && EDITOR_int_fields[30] + EDITOR_int_fields[31] > lineEndPosition) {
        possibleTrackedSyntaxToSpanSingleLine = false;
        break;
      } else {
        break;
      }
    }
  }
  let linesRemovedCount = 0;
  // -1 since you can't remove EOF
  for (var iVarDependent = cursor.indexLine; iVarDependent < EDITOR_lineEndPositionList.count - 1; iVarDependent++) {
    // TODO: all of these reads need to be raw for this work with multicursor just remember that for tomorrow don't worry about this right now just focus on the one task but remember this for tomorrow.
    let lineEnding = EDITOR_readLineEndPositionList(iVarDependent);
    if (lineEnding >= cursor.editPosition && lineEnding < cursor.editPosition + editLength) {
      linesRemovedCount++;
      cursor.editLineFeedCount++;
      EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, lineEnding);
      if (possibleTrackedSyntaxToSpanSingleLine) {
        let NOTlineEndBelongsToSyntax;
        if (iVarDependent >= EDITOR_lineEndPositionList.count) NOTlineEndBelongsToSyntax = true;else if (EDITOR_int_fields[30] + EDITOR_int_fields[31] <= EDITOR_lineEndPositionList.data[iVarDependent]) NOTlineEndBelongsToSyntax = true;
        if (NOTlineEndBelongsToSyntax) {
          EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);

          // do not increment because removed
          possibleTrackedSyntaxToSpanSingleLine = false;
          if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
            EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
            if (EDITOR_int_fields[30] < lineEnding && EDITOR_int_fields[30] + EDITOR_int_fields[31] > lineEnding) {
              possibleTrackedSyntaxToSpanSingleLine = true;
            }
          }
        }
      }
    } else {
      break;
    }
  }
  if (linesRemovedCount > 0 && possibleTrackedSyntaxToSpanSingleLine) {
    // The next line end will NOT be removed, so you need to check whether it was encompassed by the possible syntax.
    //
    // Inside the for loop you need to do this when you exhaust the encompassed line ends for a given syntax and move to the next one too.
    //
    let NOTlineEndBelongsToSyntax;
    if (iVarDependent >= EDITOR_lineEndPositionList.count) NOTlineEndBelongsToSyntax = true;else if (EDITOR_int_fields[30] + EDITOR_int_fields[31] <= EDITOR_lineEndPositionList.data[iVarDependent]) NOTlineEndBelongsToSyntax = true;
    if (NOTlineEndBelongsToSyntax) EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);
  }
  let finalLineEndPosition = EDITOR_readLineEndPositionList(cursor.indexLine + linesRemovedCount);
  let largestDrawnIndexLine = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
  let visibleLinesRemovedCount = 0;

  // 5 stages
  // ========
  // - Remove selection on large position line
  // - Remove selection on small position line
  // - Visually merge the small position line and large position line (if applicable)
  // - Remove middle line(s)
  // - 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'

  // Remove selection on small position line
  let smallLineDiv = null;
  {
    cursor.indexLine = smallLineAndColumnIndices.indexLine;
    cursor.indexColumn = smallLineAndColumnIndices.indexColumn;
    let w = walkLineUntilColumnIndex(cursor);
    let lineBoundaryPositions = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    let remaining;
    if (largePosition > lineBoundaryPositions.end) {
      remaining = lineBoundaryPositions.end - smallPosition;
    } else {
      remaining = largePosition - smallPosition;
    }
    if (w.span && w.indexColumn_SpanTextContentRelative >= 0) {
      smallLineDiv = w.div;
      while (remaining > 0) {
        let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
        let count = remaining > available ? available : remaining;
        remaining -= count;
        if (count > 0) {
          w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);
        }
        if (w.div.children.length > 1 && w.span.innerText.length === 0) {
          w.div.removeChild(w.span);
        } else {
          w.indexSpan++;
        }
        if (remaining > 0) {
          if (w.indexSpan >= w.div.children.length) break;
          w.span = w.div.children[w.indexSpan];
          w.indexColumn_SpanTextContentRelative = 0;
        }
      }
    }
  }

  // Remove selection on large position line
  let largeLineDiv = null;
  if (linesRemovedCount > 0) {
    cursor.indexLine = cursor.indexLine + linesRemovedCount;
    cursor.indexColumn = 0;
    let lineBoundaryPositions = EDITOR_getLineBoundaryPositions(cursor.indexLine);
    let remaining = largePosition - lineBoundaryPositions.start;
    let w = walkLineUntilColumnIndex(cursor);
    if (w.span && w.indexColumn_SpanTextContentRelative >= 0) {
      largeLineDiv = w.div;
      while (remaining > 0) {
        let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
        let count = remaining > available ? available : remaining;
        remaining -= count;
        if (count > 0) w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);
        if (w.div.children.length > 1 && w.span.innerText.length === 0) w.div.removeChild(w.span);else w.indexSpan++;
        if (remaining > 0) {
          if (w.indexSpan >= w.div.children.length) break;
          w.span = w.div.children[w.indexSpan];
          w.indexColumn_SpanTextContentRelative = 0;
        }
      }
    }
  }

  // The line of text that comes into view depends on the cumulative lines removed by multicursors that came before or on that line
  // 

  // TODO: There's a presumption that you have the HTML, this isn't always the case so I'll have to revisit this

  // Merge the first and last lines (if applicable)
  //
  // Four cases of existence (!... implies it does NOT exist, i.e.: it is not rendered on the UI)
  // =======================
  // - [ ] keeping, removing
  // - [ ] keeping, !removing
  // - [ ] !keeping, removing
  // - [ ] !keeping, !removing
  //
  // - [ ] Ensure all 4 cases of existence handle 'EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);'
  //
  if (linesRemovedCount > 0) {
    cursor.indexLine = smallLineAndColumnIndices.indexLine;
    cursor.indexColumn = smallLineAndColumnIndices.indexColumn;
    if (smallLineDiv) {
      if (largeLineDiv) {
        // - [x] keeping, removing
        let rememberLargeLineDivLength = largeLineDiv.children.length;
        for (var i = 0; i < rememberLargeLineDivLength; i++) {
          if (largeLineDiv.children[0].innerText.length > 0) {
            smallLineDiv.appendChild(largeLineDiv.children[0]);
          } else {
            largeLineDiv.removeChild(largeLineDiv.children[0]);
          }
        }
        visibleLinesRemovedCount++;
        largeLineDiv.innerHTML = '';
        EDITOR_baseElement.children[4].children[2].appendChild(largeLineDiv);
      } else {// - [ ] keeping, !removing
      }
    } else {
      if (largeLineDiv) {// - [ ] !keeping, removing
      } else {// - [ ] !keeping, !removing
      }
    }

    /*if (smallIndexLine < get_EDITOR_textElement().children.length && smallIndexLine >= 0) {
        
        let smallLineDiv = get_EDITOR_textElement().children[smallIndexLine];
            // Goal: If you have the line that the selection's small position is on (the keeping div)
        // then you need to get the text for the line that the selection's large position is on (the removing div).
        //
        // The goal splits into two cases:
        //
        // - If the line that the selection's large position is on exists in the viewport,
        // then you can move the HTML from the div that represents that line,
        // to the div that represents the line that the selection's small position is on.
        //
        // - If the line that the selection's large position is on does NOT exist in the viewport,
        // then you need to generate the HTML for the line's text and add it
        // to the div that represents the line that the selection's small position is on.
        // 
        // Funnily enough I might be able to just invoke 'EDITOR_drawLine(...)'.
        //
        // The function has a very frustrating quirk where the invoker has to
        // provide the div that the HTML gets appended to.
        // 
        // In addition to that, if you want to redraw the line,
        // the invoker has to set 'innerHTML' to '' prior to invoking the function.
        //
        // But this might mean I can invoke 'EDITOR_drawLine(...)'
        // without setting 'innerHTML' to '', and this would append the text of that line...
        //
        // Although I'm presuming that I'd generate the HTML
        // prior to modifying the line end position indices.
        //
        // In the current state of the code, this merging of the small and large lines
        // is done AFTER already having modified the line end position indices.
            let removingDiv = get_EDITOR_textElement().children[largeIndexLine];
        let rememberRemovingDivLength = removingDiv.children.length;
          for (var i = 0; i < rememberRemovingDivLength; i++) {
            if (removingDiv.children[0].innerText.length > 0) {
                smallLineDiv.appendChild(removingDiv.children[0]);
            }
            else {
                removingDiv.removeChild(removingDiv.children[0]);
            }
        }
          visibleLinesRemovedCount++;
        removingDiv.innerHTML = '';
        get_EDITOR_textElement().appendChild(removingDiv);
    }*/
  }

  // Remove middle line(s)
  if (linesRemovedCount > 0) {
    cursor.indexLine = smallLineAndColumnIndices.indexLine;
    // WARNING: This loop does NOT run for the small line, the small line is handled as a separate case (the case where the small and large lines are merged visually if applicable).

    for (var i = linesRemovedCount - 1; i > 0; i--) {
      let indexLine = cursor.indexLine + i;
      let relativeLineIndex = indexLine - EDITOR_int_fields[8];
      if (relativeLineIndex >= EDITOR_baseElement.children[4].children[2].children.length || relativeLineIndex < 0) {
        continue;
      }
      visibleLinesRemovedCount++;
      let textLineElement = EDITOR_baseElement.children[4].children[2].children[relativeLineIndex];
      textLineElement.innerHTML = '';
      EDITOR_baseElement.children[4].children[2].appendChild(textLineElement);
    }
  }
  cursor.editLength = editLength;

  // 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'
  if (linesRemovedCount > 0) {
    // off by 1 character
    //
    // Finalizing all cursors fixes the issue... but why was it off by 1 character?
    // 
    // TODO: this needs to be understood but delaying the finalization of an edit is more along the lines of an optimization...
    // ...versus selecting and removing text which needs to work properly both in terms of editing the text and visually displaying the correct result.
    // 
    EDITOR_finalizeAllCursors();

    // 3 cases (TODO: Ensure these for backspace and delete)
    // =======
    // - [ ] inViewTildeCase
    // - [ ] comesIntoViewDueToRemovalTildeCase
    // - [ ] notInViewTildeCase
    //
    // Each case might be the same solution I don't know I just need time to think I'm completely exhausted but ima figure it out by just typing everything out and overtime it will happen
    // 
    if (EDITOR_baseElement.children[4].children[2].children.length === EDITOR_baseElement.children[3].children[0].children.length) {
      for (let i = 0; i < visibleLinesRemovedCount; i++) {
        let gutterLineElement = EDITOR_baseElement.children[3].children[0].children[EDITOR_baseElement.children[4].children[2].children.length - 1 - i];
        gutterLineElement.innerHTML = ''; // I don't believe this will have already been cleared.
        let textLineElement = EDITOR_baseElement.children[4].children[2].children[EDITOR_baseElement.children[4].children[2].children.length - 1 - i];
        textLineElement.innerHTML = ''; // Might already be cleared, furthermore might ALWAYS be cleared.
        EDITOR_drawLine(largestDrawnIndexLine - i, gutterLineElement, textLineElement);
      }
    }
    EDITOR_drawGutter_Width();

    // TODO: 'update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count);'?
    // TODO: EDITOR_REMOVE_line_drawGutter(linesRemovedCount);
  }
  cursor.STORED_indexColumn = cursor.indexColumn;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} event 
 * @returns 
 */
function EDITOR_deleteDo(cursor, event) {
  if (cursor.hasSelection()) {
    EDITOR_removeSelection(cursor);
    return;
  }

  // raw?
  let lineEnd = EDITOR_getLineEnd_pos(cursor.indexLine);
  let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
  let w = walkLineUntilColumnIndex(cursor);
  if (w.indexColumn_Goal == lastValidIndexColumn) {
    if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
      cursor.editLength++;
      if (w.span.className === 'eCM') {
        EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);
      }

      // NOT start of file, remove the line ending and join the lines

      if (cursor.indexLine - EDITOR_int_fields[8] < EDITOR_baseElement.children[4].children[2].children.length && cursor.indexLine - EDITOR_int_fields[8] >= 0 && cursor.indexLine - EDITOR_int_fields[8] + 1 < EDITOR_baseElement.children[4].children[2].children.length && cursor.indexLine - EDITOR_int_fields[8] + 1 >= 0) {
        let keepingDiv = EDITOR_baseElement.children[4].children[2].children[cursor.indexLine - EDITOR_int_fields[8]];
        let removingDiv = EDITOR_baseElement.children[4].children[2].children[cursor.indexLine - EDITOR_int_fields[8] + 1];
        let rememberRemovingDivLength = removingDiv.children.length;
        for (var i = 0; i < rememberRemovingDivLength; i++) {
          if (removingDiv.children[0].innerText.length > 0) {
            keepingDiv.appendChild(removingDiv.children[0]);
          } else {
            removingDiv.removeChild(removingDiv.children[0]);
          }
        }

        // TODO: This is NOT an optimal solution to removing the empty span after joining the lines
        if (keepingDiv.children.length > 1 && keepingDiv.children[0].innerText.length === 0) {
          keepingDiv.removeChild(keepingDiv.children[0]);
        }
        removingDiv.appendChild(document.createElement('span'));
        EDITOR_baseElement.children[4].children[2].appendChild(removingDiv);

        // EDITOR_drawLine: copy, paste, modify; TODO: deduplicate this paragraph that redraws the final line in the viewport?
        let largestDrawnIndexLine = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
        let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(largestDrawnIndexLine);
        if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
          trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
        }
        let line = EDITOR_getLineBoundaryPositions(largestDrawnIndexLine);
        EDITOR_createSpansForLineOfText(removingDiv, line.start, line.end, trackedSyntax_StartingIndex);
      }
      cursor.editLineFeedCount++;
      EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, lineEnd);
      EDITOR_REMOVE_line_drawGutter(1);

      // TODO: temp and bad idea.
      EDITOR_finalizeAllCursors();
    } else {
      // Start of file
      // nothing?
    }
  } else {
    let remaining = 1;
    if (event.ctrlKey) {
      // cursor.editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
      let tempColumnIndex = cursor.indexColumn;
      let tempPosition = cursor.editPosition;
      let originalCharacterKind = EDITOR_getCharacterCurrent_KIND(tempColumnIndex, tempPosition, lineEnd);
      tempColumnIndex++;
      tempPosition++;
      while (cursor.indexColumn < lastValidIndexColumn) {
        if (EDITOR_getCharacterCurrent_KIND(tempColumnIndex, tempPosition, lineEnd) !== originalCharacterKind) {
          break;
        }
        tempColumnIndex++;
        tempPosition++;
        remaining++;
      }
    }
    if (!w.span || !w.span.innerText || w.indexColumn_SpanTextContentRelative < 0) {
      cursor.editLength += remaining;
    } else {
      // TODO: The shared "remove" method would likely look something like this 'while (remaining ...)' logic...
      // ...and also have to include the line ending removal logic
      while (remaining > 0) {
        let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
        let count = remaining > available ? available : remaining;
        remaining -= count;

        // When the cursor is at the end of a span, there is no text to delete, because the text starts in the next span.
        if (count > 0) {
          // this is probably wrong
          w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);
          cursor.editLength += count;
        }
        if (w.div.children.length > 1 && w.span.innerText.length === 0) {
          w.div.removeChild(w.span);
        } else {
          w.indexSpan++;
        }
        if (remaining > 0) {
          if (w.indexSpan >= w.div.children.length) return;
          w.span = w.div.children[w.indexSpan];
          w.indexColumn_SpanTextContentRelative = 0;
        }
      }
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} event 
 * @returns 
 */
function EDITOR_backspaceDo(cursor, event) {
  if (cursor.hasSelection()) {
    EDITOR_removeSelection(cursor);
    return;
  }
  let w = walkLineUntilColumnIndex(cursor);
  if (w.indexColumn_Goal == 0) {
    if (cursor.indexLine > 0) {
      let rememberLineIndex = cursor.indexLine;

      // TODO: multicursor bugs are more likely to occur with this logic:
      // TODO: this logic is extremely suspect given editIndexLine and editIndexColumn...
      // ...as well if you move the cursor during a pending edit then finalize does it edit the correct positions?
      //
      // wrap to previous line
      cursor.indexLine--;
      cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
      cursor.editPosition--;
      cursor.editLength++;
      if (w.span.className === 'eCM') {
        EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);
      }
      if (rememberLineIndex - EDITOR_int_fields[8] - 1 < EDITOR_baseElement.children[4].children[2].children.length && rememberLineIndex - EDITOR_int_fields[8] - 1 >= 0 && rememberLineIndex - EDITOR_int_fields[8] < EDITOR_baseElement.children[4].children[2].children.length && rememberLineIndex - EDITOR_int_fields[8] >= 0) {
        // NOT start of file, backspace the line ending and join the lines
        let keepingDiv = EDITOR_baseElement.children[4].children[2].children[rememberLineIndex - EDITOR_int_fields[8] - 1];
        let removingDiv = EDITOR_baseElement.children[4].children[2].children[rememberLineIndex - EDITOR_int_fields[8]];
        let rememberRemovingDivLength = removingDiv.children.length;
        for (var i = 0; i < rememberRemovingDivLength; i++) {
          if (removingDiv.children[0].innerText.length > 0) {
            keepingDiv.appendChild(removingDiv.children[0]);
          } else {
            removingDiv.removeChild(removingDiv.children[0]);
          }
        }

        // TODO: This is NOT an optimal solution to removing the empty span after joining the lines
        if (keepingDiv.children.length > 1 && keepingDiv.children[0].innerText.length === 0) {
          keepingDiv.removeChild(keepingDiv.children[0]);
        }
        removingDiv.appendChild(document.createElement('span'));
        EDITOR_baseElement.children[4].children[2].appendChild(removingDiv);

        // EDITOR_drawLine: copy, paste, modify; TODO: deduplicate this paragraph that redraws the final line in the viewport?
        let largestDrawnIndexLine = EDITOR_int_fields[8] + EDITOR_int_fields[9] - 1;
        let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(largestDrawnIndexLine);
        if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
          trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
        }
        let line = EDITOR_getLineBoundaryPositions(largestDrawnIndexLine);
        EDITOR_createSpansForLineOfText(removingDiv, line.start, line.end, trackedSyntax_StartingIndex);
      }
      cursor.editLineFeedCount++;
      EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, cursor.editPosition);
      EDITOR_REMOVE_line_drawGutter(1);

      // TODO: temp and bad idea.
      EDITOR_finalizeAllCursors();
    } else {
      // Start of file
      // nothing?
    }
  } else {
    let remaining = 1;
    if (event.ctrlKey) {
      // cursor.editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
      let originalCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, cursor.editPosition);
      cursor.indexColumn--;
      cursor.editPosition--;
      //cursor.editIndexLine--;
      cursor.editIndexColumn--;
      while (cursor.indexColumn > 0) {
        if (EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, cursor.editPosition) !== originalCharacterKind) {
          break;
        }
        cursor.indexColumn--;
        cursor.editPosition--;
        //cursor.editIndexLine--;
        cursor.editIndexColumn--;
        remaining++;
      }
    } else {
      cursor.indexColumn -= 1;
      cursor.editPosition -= 1;
      //cursor.editIndexLine -= 1;
      cursor.editIndexColumn -= 1;
    }
    if (!w.span || !w.span.innerText || w.indexColumn_SpanTextContentRelative < 0) {
      cursor.editLength += remaining;
    } else {
      // TODO: The shared "remove" method would likely look something like this 'while (remaining ...)' logic...
      // ...and also have to include the line ending removal logic
      while (remaining > 0) {
        let count = remaining > w.indexColumn_SpanTextContentRelative ? w.indexColumn_SpanTextContentRelative : remaining;
        remaining -= count;

        // this is probably wrong
        w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative - count) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
        cursor.editLength += count;
        if (w.div.children.length > 1 && w.span.innerText.length === 0) {
          w.div.removeChild(w.span);
        }
        w.indexSpan--;
        if (remaining > 0) {
          if (w.indexSpan < 0) return;
          w.span = w.div.children[w.indexSpan];
          w.indexColumn_SpanTextContentRelative = w.span.innerText.length;
        }
      }
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {string} character 
 */
function EDITOR_insertDo(cursor, character) {
  /*
  TODO: (optimization idea) if you are inserting at the 0th or length position it might be worthwhile
  to have a conditional branch make the innerText with 1 less slice invocation.
    TODO: (optimization idea) I'm going to get this less optimized version to work, but you might want to
  make a copy of the span so you only have to "insert" text to the end of the span.
  And then this removes 1 of the slice invocations, rather than inserting "possibly" among the existing innerText.
  */

  if (cursor.gapBufferWriteToSpanElement !== EDITOR_offsetWithinSpan_withRespectToThisSpan) {
    EDITOR_int_fields[17] = 0;
    EDITOR_offsetWithinSpan_withRespectToThisSpan = cursor.gapBufferWriteToSpanElement;
  }
  if (cursor.gapBufferWriteToSpanElement) {
    cursor.gapBufferWriteToSpanElement.innerText = cursor.gapBufferWriteToSpanElement.innerText.slice(0, cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex + EDITOR_int_fields[17] + cursor.gapBufferCount) + character + cursor.gapBufferWriteToSpanElement.innerText.slice(cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex + EDITOR_int_fields[17] + cursor.gapBufferCount);
  }
  cursor.gapBuffer[cursor.gapBufferCount] = character.charCodeAt(0);
  cursor.gapBufferCount++;
  cursor.editLength++;
  cursor.indexColumn++;
  EDITOR_int_fields[17] = EDITOR_int_fields[17] + cursor.gapBufferCount;
}
function EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor) {
  // binary search for 'if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > positionIndex)'
  let indexTrackedSyntax = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(cursor.indexLine);
  if (indexTrackedSyntax === NaN || indexTrackedSyntax === -1) {
    indexTrackedSyntax = EDITOR_trackedSyntaxList.count_abstract;
  }
  if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
    EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
    if (EDITOR_int_fields[30] < cursor.editPosition) {
      let moreThanOneLineEndPositionIsEncompassed = false;

      // TODO: This has no reason to be a for loop
      for (let i = cursor.indexLine - 1; i >= 0; i--) {
        let lineEndPosition = EDITOR_lineEndPositionList.data[i];
        if (EDITOR_int_fields[30] < lineEndPosition && EDITOR_int_fields[30] + EDITOR_int_fields[31] > lineEndPosition) {
          moreThanOneLineEndPositionIsEncompassed = true;
          break;
        } else {
          break;
        }
      }
      if (!moreThanOneLineEndPositionIsEncompassed) {
        // TODO: This has no reason to be a for loop
        for (let i = cursor.indexLine + 1; i < EDITOR_lineEndPositionList.count; i++) {
          let lineEndPosition = EDITOR_lineEndPositionList.data[i];
          if (EDITOR_int_fields[30] < lineEndPosition && EDITOR_int_fields[30] + EDITOR_int_fields[31] > lineEndPosition) {
            moreThanOneLineEndPositionIsEncompassed = true;
            break;
          } else {
            break;
          }
        }
        if (!moreThanOneLineEndPositionIsEncompassed) {
          EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);
        }
      }
    }
  }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_scrollCursorIntoView(cursor) {
  let scrollX = 0;
  let scrollY = 0;
  if (cursor.cursorTopValue < EDITOR_baseElement.scrollTop) {
    scrollY = cursor.cursorTopValue - EDITOR_baseElement.scrollTop;
  } else if (cursor.cursorTopValue >= EDITOR_baseElement.scrollTop + EDITOR_baseElement.offsetHeight) {
    // I want to use clientHeight but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
    // scrollBy over and over.

    // make the bottom touch then add lineHeight is probably the algorithm to get a perfect fill maybe do lineHeight * 2 skip an event when spamming arrowDown?
    let currentBottom = EDITOR_baseElement.scrollTop + EDITOR_baseElement.offsetHeight;
    let changeToMakeBottomTouch = cursor.cursorTopValue - currentBottom;
    scrollY = changeToMakeBottomTouch + 2 * EDITOR_int_fields[2];
  }
  if (cursor.cursorLeftValue < EDITOR_baseElement.scrollLeft) {
    scrollX = cursor.cursorLeftValue - EDITOR_baseElement.scrollLeft;
  } else if (cursor.cursorLeftValue >= EDITOR_baseElement.scrollLeft + EDITOR_baseElement.offsetWidth) {
    // I want to use clientWidth but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
    // scrollBy over and over.

    // make the right touch then add characterWidth is probably the algorithm to get a perfect fill maybe do characterWidth * 2 skip an event when spamming arrowRight?
    let currentRight = EDITOR_baseElement.scrollLeft + EDITOR_baseElement.offsetWidth;
    let changeToMakeRightTouch = cursor.cursorLeftValue - currentRight;
    scrollX = changeToMakeRightTouch + 4 * EDITOR_characterWidth;
  }
  EDITOR_baseElement.scrollBy(scrollX, scrollY);
}
function EDITOR_getCharacterKind(character) {
  switch (character) {
    case 'a':
    case 'b':
    case 'c':
    case 'd':
    case 'e':
    case 'f':
    case 'g':
    case 'h':
    case 'i':
    case 'j':
    case 'k':
    case 'l':
    case 'm':
    case 'n':
    case 'o':
    case 'p':
    case 'q':
    case 'r':
    case 's':
    case 't':
    case 'u':
    case 'v':
    case 'w':
    case 'x':
    case 'y':
    case 'z':
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'G':
    case 'H':
    case 'I':
    case 'J':
    case 'K':
    case 'L':
    case 'M':
    case 'N':
    case 'O':
    case 'P':
    case 'Q':
    case 'R':
    case 'S':
    case 'T':
    case 'U':
    case 'V':
    case 'W':
    case 'X':
    case 'Y':
    case 'Z':
    case '_':
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return 3;
    case ' ':
    case '\t':
    case '\r':
    case '\n':
      return 1;
    default:
      return 2;
  }
}
async function EDITOR_MenuOnClick(indexClicked, elementClicked) {
  const commandKind = parseInt(elementClicked.dataset.commandKind, 10);
  if (!commandKind) {
    return;
  }
  switch (commandKind) {
    case CommandKind.Cut:
      EDITOR_finalizeAllCursors();
      await EDITOR_copySelection(EDITOR_primaryCursor);
      EDITOR_removeSelection(EDITOR_primaryCursor);
      EDITOR_drawCursor(EDITOR_primaryCursor);
      return;
    case CommandKind.Copy:
      EDITOR_finalizeAllCursors();
      return EDITOR_copySelection(EDITOR_primaryCursor);
    case CommandKind.Paste:
      EDITOR_finalizeAllCursors();
      let clipboard = await window.myAPI.readClipboard();
      EDITOR_paste(EDITOR_primaryCursor, clipboard);
      EDITOR_drawCursor(EDITOR_primaryCursor);
      return;
    case CommandKind.Find:
      EDITOR_findOverlay_showSetter(!EDITOR_byte_fields[2]);
      return;
  }
}

/**
 * This clears the cursor's selection.
 */
function EDITOR_moveCursor_position(intValue) {
  let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(intValue);
  EDITOR_moveCursor_lineIndex_columnIndex(lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn);
}

/**
 * This clears the cursor's selection.
 */
function EDITOR_moveCursor_lineIndex_columnIndex(indexLine, indexColumn) {
  let lastValidColumnIndex = EDITOR_getLastValidIndexColumn(indexLine);
  if (indexColumn > lastValidColumnIndex) {
    EDITOR_primaryCursor.indexColumn = lastValidColumnIndex;
  } else {
    EDITOR_primaryCursor.indexColumn = indexColumn;
  }
  EDITOR_primaryCursor.indexLine = indexLine;

  // TODO: selectionAnchor = selectionEnd; EDITOR_drawCursor(cursor); # being the way to clear a selection should be documented / wrapped by a method for ease of use / readability?
  EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
  EDITOR_drawCursor(EDITOR_primaryCursor);
}

/**
 * Tabs are stored as '\t\0\0\0', all line feeds converted to '\n'.
 * 
 * textonly is in reference to conversion of the raw storage of the text editor such that a tab of '\t\0\0\0' is returned as just '\t', and all line feeds as EDITOR_lineEndString
 * 
 * @returns {string}
 */
function EDITOR_decode_textonly(start, length) {
  if (!EDITOR_lineEndString) EDITOR_lineEndString = '\n';

  // TODO: repeated duplications of the same extremely large selection might benefit from temporary caching of this functions result.
  let EDITOR_decode_pooled_stringBuilder_array = new Array(length);
  let end = start + length;
  let bytes = EDITOR_textByteList.bytes;
  if (length <= 0) {
    return '';
  }
  for (let i = start; i < end; i++) {
    switch (bytes[i]) {
      case 0:
        // NUL
        break;
      case 9:
        // TAB
        EDITOR_decode_pooled_stringBuilder_array.push('\t');
        break;
      case 10:
        // LF
        EDITOR_decode_pooled_stringBuilder_array.push(EDITOR_lineEndString);
        break;
      case 32:
        // Space
        EDITOR_decode_pooled_stringBuilder_array.push(' ');
        break;
      case 33:
        // !
        EDITOR_decode_pooled_stringBuilder_array.push('!');
        break;
      case 34:
        // "
        EDITOR_decode_pooled_stringBuilder_array.push('"');
        break;
      case 35:
        // #
        EDITOR_decode_pooled_stringBuilder_array.push('#');
        break;
      case 36:
        // $ (I think???)
        EDITOR_decode_pooled_stringBuilder_array.push('$');
        break;
      case 37:
        // %
        EDITOR_decode_pooled_stringBuilder_array.push('%');
        break;
      case 38:
        // & (I think???)
        EDITOR_decode_pooled_stringBuilder_array.push('&');
        break;
      case 39:
        // ' (I think???)
        EDITOR_decode_pooled_stringBuilder_array.push('\'');
        break;
      case 40:
        // (
        EDITOR_decode_pooled_stringBuilder_array.push('(');
        break;
      case 41:
        // )
        EDITOR_decode_pooled_stringBuilder_array.push(')');
        break;
      case 42:
        // *
        EDITOR_decode_pooled_stringBuilder_array.push('*');
        break;
      case 43:
        // +
        EDITOR_decode_pooled_stringBuilder_array.push('+');
        break;
      case 44:
        // , (I think???)
        EDITOR_decode_pooled_stringBuilder_array.push(',');
        break;
      case 45:
        // -
        EDITOR_decode_pooled_stringBuilder_array.push('-');
        break;
      case 46:
        // .
        EDITOR_decode_pooled_stringBuilder_array.push('.');
        break;
      case 47:
        // /
        EDITOR_decode_pooled_stringBuilder_array.push('/');
        break;
      case 48:
        // 0
        EDITOR_decode_pooled_stringBuilder_array.push('0');
        break;
      case 49:
        // 1
        EDITOR_decode_pooled_stringBuilder_array.push('1');
        break;
      case 50:
        // 2
        EDITOR_decode_pooled_stringBuilder_array.push('2');
        break;
      case 51:
        // 3
        EDITOR_decode_pooled_stringBuilder_array.push('3');
        break;
      case 52:
        // 4
        EDITOR_decode_pooled_stringBuilder_array.push('4');
        break;
      case 53:
        // 5
        EDITOR_decode_pooled_stringBuilder_array.push('5');
        break;
      case 54:
        // 6
        EDITOR_decode_pooled_stringBuilder_array.push('6');
        break;
      case 55:
        // 7
        EDITOR_decode_pooled_stringBuilder_array.push('7');
        break;
      case 56:
        // 8
        EDITOR_decode_pooled_stringBuilder_array.push('8');
        break;
      case 57:
        // 9
        EDITOR_decode_pooled_stringBuilder_array.push('9');
        break;
      case 58:
        // :
        EDITOR_decode_pooled_stringBuilder_array.push(':');
        break;
      case 59:
        // ;
        EDITOR_decode_pooled_stringBuilder_array.push(';');
        break;
      case 60:
        // <
        EDITOR_decode_pooled_stringBuilder_array.push('<');
        break;
      case 61:
        // =
        EDITOR_decode_pooled_stringBuilder_array.push('=');
        break;
      case 62:
        // >
        EDITOR_decode_pooled_stringBuilder_array.push('>');
        break;
      case 63:
        // ?
        EDITOR_decode_pooled_stringBuilder_array.push('?');
        break;
      case 64:
        // @
        EDITOR_decode_pooled_stringBuilder_array.push('@');
        break;
      case 65:
        // A
        EDITOR_decode_pooled_stringBuilder_array.push('A');
        break;
      case 66:
        // B
        EDITOR_decode_pooled_stringBuilder_array.push('B');
        break;
      case 67:
        // C
        EDITOR_decode_pooled_stringBuilder_array.push('C');
        break;
      case 68:
        // D
        EDITOR_decode_pooled_stringBuilder_array.push('D');
        break;
      case 69:
        // E
        EDITOR_decode_pooled_stringBuilder_array.push('E');
        break;
      case 70:
        // F
        EDITOR_decode_pooled_stringBuilder_array.push('F');
        break;
      case 71:
        // G
        EDITOR_decode_pooled_stringBuilder_array.push('G');
        break;
      case 72:
        // H
        EDITOR_decode_pooled_stringBuilder_array.push('H');
        break;
      case 73:
        // I
        EDITOR_decode_pooled_stringBuilder_array.push('I');
        break;
      case 74:
        // J
        EDITOR_decode_pooled_stringBuilder_array.push('J');
        break;
      case 75:
        // K
        EDITOR_decode_pooled_stringBuilder_array.push('K');
        break;
      case 76:
        // L
        EDITOR_decode_pooled_stringBuilder_array.push('L');
        break;
      case 77:
        // M
        EDITOR_decode_pooled_stringBuilder_array.push('M');
        break;
      case 78:
        // N
        EDITOR_decode_pooled_stringBuilder_array.push('N');
        break;
      case 79:
        // O
        EDITOR_decode_pooled_stringBuilder_array.push('O');
        break;
      case 80:
        // P
        EDITOR_decode_pooled_stringBuilder_array.push('P');
        break;
      case 81:
        // Q
        EDITOR_decode_pooled_stringBuilder_array.push('Q');
        break;
      case 82:
        // R
        EDITOR_decode_pooled_stringBuilder_array.push('R');
        break;
      case 83:
        // S
        EDITOR_decode_pooled_stringBuilder_array.push('S');
        break;
      case 84:
        // T
        EDITOR_decode_pooled_stringBuilder_array.push('T');
        break;
      case 85:
        // U
        EDITOR_decode_pooled_stringBuilder_array.push('U');
        break;
      case 86:
        // V
        EDITOR_decode_pooled_stringBuilder_array.push('V');
        break;
      case 87:
        // W
        EDITOR_decode_pooled_stringBuilder_array.push('W');
        break;
      case 88:
        // X
        EDITOR_decode_pooled_stringBuilder_array.push('X');
        break;
      case 89:
        // Y
        EDITOR_decode_pooled_stringBuilder_array.push('Y');
        break;
      case 90:
        // Z
        EDITOR_decode_pooled_stringBuilder_array.push('Z');
        break;
      case 91:
        // [
        EDITOR_decode_pooled_stringBuilder_array.push('[');
        break;
      case 92:
        // \
        EDITOR_decode_pooled_stringBuilder_array.push('\\');
        break;
      case 93:
        // ]
        EDITOR_decode_pooled_stringBuilder_array.push(']');
        break;
      case 94:
        // ^
        EDITOR_decode_pooled_stringBuilder_array.push('^');
        break;
      case 95:
        // _
        EDITOR_decode_pooled_stringBuilder_array.push('_');
        break;
      case 96:
        // `
        EDITOR_decode_pooled_stringBuilder_array.push('`');
        break;
      case 97:
        // a
        EDITOR_decode_pooled_stringBuilder_array.push('a');
        break;
      case 98:
        // b
        EDITOR_decode_pooled_stringBuilder_array.push('b');
        break;
      case 99:
        // c
        EDITOR_decode_pooled_stringBuilder_array.push('c');
        break;
      case 100:
        // d
        EDITOR_decode_pooled_stringBuilder_array.push('d');
        break;
      case 101:
        // e
        EDITOR_decode_pooled_stringBuilder_array.push('e');
        break;
      case 102:
        // f
        EDITOR_decode_pooled_stringBuilder_array.push('f');
        break;
      case 103:
        // g
        EDITOR_decode_pooled_stringBuilder_array.push('g');
        break;
      case 104:
        // h
        EDITOR_decode_pooled_stringBuilder_array.push('h');
        break;
      case 105:
        // i
        EDITOR_decode_pooled_stringBuilder_array.push('i');
        break;
      case 106:
        // j
        EDITOR_decode_pooled_stringBuilder_array.push('j');
        break;
      case 107:
        // k
        EDITOR_decode_pooled_stringBuilder_array.push('k');
        break;
      case 108:
        // l
        EDITOR_decode_pooled_stringBuilder_array.push('l');
        break;
      case 109:
        // m
        EDITOR_decode_pooled_stringBuilder_array.push('m');
        break;
      case 110:
        // n
        EDITOR_decode_pooled_stringBuilder_array.push('n');
        break;
      case 111:
        // o
        EDITOR_decode_pooled_stringBuilder_array.push('o');
        break;
      case 112:
        // p
        EDITOR_decode_pooled_stringBuilder_array.push('p');
        break;
      case 113:
        // q
        EDITOR_decode_pooled_stringBuilder_array.push('q');
        break;
      case 114:
        // r
        EDITOR_decode_pooled_stringBuilder_array.push('r');
        break;
      case 115:
        // s
        EDITOR_decode_pooled_stringBuilder_array.push('s');
        break;
      case 116:
        // t
        EDITOR_decode_pooled_stringBuilder_array.push('t');
        break;
      case 117:
        // u
        EDITOR_decode_pooled_stringBuilder_array.push('u');
        break;
      case 118:
        // v
        EDITOR_decode_pooled_stringBuilder_array.push('v');
        break;
      case 119:
        // w
        EDITOR_decode_pooled_stringBuilder_array.push('w');
        break;
      case 120:
        // x
        EDITOR_decode_pooled_stringBuilder_array.push('x');
        break;
      case 121:
        // y
        EDITOR_decode_pooled_stringBuilder_array.push('y');
        break;
      case 122:
        // z
        EDITOR_decode_pooled_stringBuilder_array.push('z');
        break;
      case 123:
        // {
        EDITOR_decode_pooled_stringBuilder_array.push('{');
        break;
      case 124:
        // |
        EDITOR_decode_pooled_stringBuilder_array.push('|');
        break;
      case 125:
        // }
        EDITOR_decode_pooled_stringBuilder_array.push('}');
        break;
      case 126:
        // ~
        EDITOR_decode_pooled_stringBuilder_array.push('~');
        break;
      default:
        EDITOR_decode_pooled_stringBuilder_array.push(EDITOR_decoder.decode(bytes.subarray(i, i + 1)));
        break;
    }
  }
  return EDITOR_decode_pooled_stringBuilder_array.join('');
}
function EDITOR_toExtensionKind(extensionWithPeriod) {
  switch (extensionWithPeriod) {
    case '.js':
    case '.cjs':
      return 1;
    default:
      return 0;
  }
}
function EDITOR_language_line_lex_SET(extensionKind) {
  switch (extensionKind) {
    case 1:
      EDITOR_language_line_lex = JS_line_lex;
      break;
    default:
      EDITOR_language_line_lex = PLAINTEXT_line_lex;
      break;
  }
}

/**
 * TODO: this can be way faster all I did was take JS_line_lex and then strip away all the details...
 * ...I'm more concerned with tightening the difference between best and worst case...
 * ...by reducing worst case.
 * This makes line lexing JS faster so it is preferable even if I don't write this plaintext implementation perfectly.
 * "maybe" it's faster I didn't measure anything but I swear I know what I'm doing
 * not only did I not measure it but I went back and forth between vscode I actually have no idea if this faster I can't remember anything I'm super tired.
 * I'm tired and I still have to write more of the multicursor logic so I'm just vibing out the optimizations for a bit I'll get measurements later when the app works more.
 */
function PLAINTEXT_line_lex(div, substart, lineEnd, childIndex) {
  let length = 0;
  let pos = substart;
  let bytes = EDITOR_textByteList.bytes;
  while (pos < lineEnd) {
    length++;
    pos++;
  }
  if (length > 0) {
    let span;
    if (childIndex < div.children.length) {
      span = div.children[childIndex++];
      span.className = '';
    } else {
      span = document.createElement('span');
      div.appendChild(span);
      childIndex++;
    }
    span.innerText = EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(substart, substart + length));
  }
  return childIndex;
}

/*
- [ ] Duplicate:
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] Paste:
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] Check the enter key drawing logic
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] HTML span element pooling

Context Menu Options
====================
|
# File
- [x] Copy               => file:///C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries\editorGlobal.js
- [x] Copy Absolute Path => C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries\editorGlobal.js
- [x] Delete             => "src\Database\PineapplePizza\aaa.txt" was successfully deleted
- [x] Rename             => "aaa.txt" was successfully renamed to "lemonLimeZebra.txt"
- [ ] Consider making a new file, then whether the immediate id attached is correct if you try to then immediately rename it and etc... I believe this has worked in the past, but I want to check
- [/] Cut
|
# Directory
- [/] Copy               => file:///C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries
- [/] Copy Absolute Path => C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries
- [/] New File           => "appleSauce.txt" was successfully made as a text file
- [/] New Directory      => "PineapplePizza" was successfully made as a directory
- [/] Delete             => "PineapplePizza" was successfully deleted but an oddity occurred that I think is related to me having reproduced a bug prior to deleting the directory.
- [/] Rename             => "PineapplePizza" was successfully renamed to "PineapplePizza_v2"
- [ ] Consider making a new directory, then whether the immediate id attached is correct if you try to then immediately rename it and etc... I believe this has worked in the past, but I want to check
- [x] Paste              => The pasted source path is: => { File, Directory }
- [ ] Cut
    - [ ] The pasted source path is:
        - [/] File
            - [ ] BUG: this didn't draw the remove of the file child node from the containing directory even though it was removed from the filesystem
        - [/] Directory
            - [ ] BUG: { directory_cut -> directory_paste } this successfully drew the remove of the directory child node from the containing directory, BUT it inserted the paste between InternalLibraries/ and its children (InternalLibraries/ was expanded at the time). So you need to find the index relative to the depth, and then furthermore check if the index you landed on, whether the (previous?) node is expanded and has children.
|
# Bug list:
- [ ] Make a directory
    - [ ] Expand the directory (I think?)
    - [ ] Then make a new file in it, you'll add the file to the wrong place
    - [ ] or maybe it wasn't expanded so it found the closest expanded node and that's the bug...?
    - [ ] When is newly made directory:
        - [ ] When is expanded:
        - [ ] When is not expanded:
    - [ ] When is existing directory:
        - [ ] When is expanded:
        - [ ] When is not expanded:
            - [ ] The newly made file is erroneously added as a child node to the directory even though the directory isn't expanded.
            - [ ] Is this to say that if the new file would be child index 1 that the when collapsed would put it as the child of the next or something?
- [x] Copy a file, then try to paste it into a directory and you get the following error: "TypeError: Cannot read properties of null (reading 'id')".
- [ ] BUG: { file_cut -> directory_paste } this didn't draw the remove of the file child node from the containing directory even though it was removed from the filesystem
- [ ] BUG: { directory_cut -> directory_paste } this successfully drew the remove of the directory child node from the containing directory, BUT it inserted the paste between InternalLibraries/ and its children (InternalLibraries/ was expanded at the time). So you need to find the index relative to the depth, and then furthermore check if the index you landed on, whether the (previous?) node is expanded and has children.
- [x] BUG: trying to collapse an empty directory is acting weird, I don't see an error.
- [x] BUG: ArrowRight when directory is expanded but has 0 children.
- [ ] Related to the tree view, the following exception consistently is thrown when scrolling: "ReferenceError: event_scroll_async_timeoutFunc is not defined".
*/
