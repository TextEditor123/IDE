
/*
    ASCII:
    ------
    " => 34,
    ' => 39,
    / => 47,
    \ => 92,
    * => 42,
    \n => 10,
*/
const js_DOUBLEQUOTE = 34;
const js_SINGLEQUOTE = 39;
const js_BACKTICK = 96;
const js_FORWARDSLASH = 47;
const js_BACKSLASH = 92;
const js_ASTERISK = 42;
const js_LINEFEED = 10;
const js_OPENPARENTHESIS = 40;
const js_CLOSEPARENTHESIS = 41;
const js_PERIOD = 46;
const js_EQUALS = 61;
const js_OPENBRACKET = 60;
const js_CLOSEBRACKET = 62;
const js_BANG = 33;
const js_PLUS = 43;
const js_MINUS = 45;
const js_STAR = 42;
const js_PERCENT = 37;
const js_AMPERSAND = 38;
const js_PIPE = 124;
const js_QUESTIONMARK = 63;
const js_CARET = 94;

/*
Google AI Overview for "javascript do global const numbers have gc overhead":
```paraphrased
No, global const numbers have virtually no garbage collection (GC) overhead.
...
```

Followup question to the original prompt context "what about gc overhead during the mark phase":
```paraphrased
Global primitive numbers have essentially zero garbage collection overhead during the mark phase.

Modern JavaScript engines (like V8 in Chrome and Node.js) optimize this phase so that global primitive constants add no measurable work for the collector.

...

Once the GC looks at the global scope, it sees a primitive value and stops instantly. It does not traverse any deeper.

...
```

Wait what was that? "Once the GC looks at the global scope, it sees a primitive value and stops instantly. It does not traverse any deeper.".
So it does have overhead? It needs to still acknowledge that it is a primitive.

I don't trust numbers.
*/

// TODO: There is a bug in the newline logic where the line being shown that I enter key into existence doesn't show or something until I scroll.
/*
I've decided that I want all "assignment" operators to be syntax highlighted.
So I need to get a list of them...

Equals
PlusEquals
MinusEquals

...

Google AI Overview "javascript all assignment operators" paraphrased:

Basic Assignment:
=

Arithmetic Compound Assignment:
+=
-=
*=
/=
%=
**=

Logical Assignment Operators:
&&=
||=
??=

Bitwise Compound Assignment
&=
|=
^=
<<=
>>=
>>>=

========
========
========
========

I need to group them by first character

=
+=
-=
*=
/=
%=
**=
&=
&&=
|=
||=
??=
^=
<<=
>>=
>>>=

========
========
========
========

after I get this done I need to make non-zero measurable progress on multicursor
maybe that means batching when holding the enter key but then that's not exactly "related related" but it is "related"

TODO: '=>'... it isn't working and I'm exhausted I'm not doing it right now...
...at this point might as well say "TODO: 99% of the code I just wrote isn't working"

*/

/**
 * @param {Uint8Array} bytes 
 * @returns trackedSyntaxList
 */
function JS_full_lex(bytes, count) {
    
    let trackedSyntaxList = new TrackedSyntaxList(32);
    let pos = 0;

    while (pos < count) {
        switch (bytes[pos]) {
            case js_DOUBLEQUOTE:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_DOUBLEQUOTE);
                continue;
            case js_SINGLEQUOTE:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_SINGLEQUOTE);
                continue;
            case js_BACKTICK:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_BACKTICK);
                continue;
            case js_FORWARDSLASH:
                if (bytes[pos + 1] === js_FORWARDSLASH) {
                    pos = lex_comment_singleLine(bytes, count, pos, trackedSyntaxList);
                    continue;
                }
                else if (bytes[pos + 1] === js_ASTERISK) {
                    pos = lex_comment_multiLine(bytes, count, pos, trackedSyntaxList);
                    continue;
                }

                break;
            case js_ASTERISK:
                break;
            case js_LINEFEED:
                break;
        }

        pos++;
    }

    return trackedSyntaxList;
}

/**
 * @returns pos
 */
function lex_comment_singleLine(bytes, count, pos, trackedSyntaxList) {
    // The current character is the first forward slash of the 'two consecutive ones' that represent the start of a single line comment.
    let start = pos;
    let length = 0;
    // "changing" this to guarantee at least 1 read means you can continue after the invocation returns (for the while loop)
    // All in all, this already was guaranteed to read at least 1 since the while loop's condition in this method
    // This change is moreso a matter of anxiety and me not wanting to deal with this at the moment so I need to see the explicit read here so I can sleep at night for the time being until my stress levels are lower.
    length++;
    pos++;
    while (pos < count) {
        if (bytes[pos] === js_LINEFEED) {
            break;
        }
        length++;
        pos++;
    }

    return pos;
}

/**
 * This code is somewhat duplicated within 'function JS_line_lex(...)' when handling any "multi-line-comments" that span only a single line.
 * @returns pos
 */
function lex_comment_multiLine(bytes, count, pos, trackedSyntaxList) {
    // The current character is the first forward slash of the 'forwardslash and asterisk' that represent the start of a single line comment.
    let start = pos;
    let length = 0;
    // Move past the 'forwardslash and asterisk'
    length += 2;
    pos += 2;

    let seenLineFeed = false;

    // I'm starting this at 2 because 0 would bug (-1 + 1 === 0)
    // but then I just don't want to deal with this so I need to go 1,
    // then like I'm tired and I don't want to deal with this so I'll just go to 2 and surely nothing bad can happen
    // but in reality I probably only need to start at 1 (or start of other ticket variables + 2 or something idk I don't wanna deal with this right now).
    let ticketSource = 2;
    let ticketAsterisk = -1;
    let ticketForwardSlash = -1;
    while (pos < count) {
        switch (bytes[pos]) {
            case js_ASTERISK:
                ticketAsterisk = ticketSource++;
                break;
            case js_FORWARDSLASH:
                ticketForwardSlash = ticketSource++;
                break;
            case js_LINEFEED:
                seenLineFeed = true;
                ticketSource++;
                break;
            default:
                ticketSource++;
                break;
        }
        length++;
        pos++;
        if (ticketAsterisk + 1 === ticketForwardSlash) {
            break;
        }
    }

    if (seenLineFeed) {
        trackedSyntaxList.insert(trackedSyntaxList.count_abstract, TrackedSyntaxKind.Comment, start, length);
    }

    return pos;
}

/**
 * This code is somewhat duplicated within 'function JS_line_lex(...)' when handling any ASCII code that could start a string.
 * @returns pos
 */
function lex_string(bytes, count, pos, trackedSyntaxList, terminator) {
    // The current character is the byte that represent the start of a string.
    let start = pos;
    let length = 0;
    // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
    length++;
    pos++;

    let seenLineFeed = false;

    while (pos < count) {

        if (bytes[pos] === js_LINEFEED) { // the editor only stores line feed ASCII codes and "swaps them out" when saving/copying text.
            seenLineFeed = true;
            if (terminator !== js_BACKTICK) break;
        }

        if (bytes[pos] === terminator) {
            length++;
            pos++;
            break;
        }
        else if (bytes[pos] === js_BACKSLASH) {
            length++;
            pos++;
            if (pos < count) {
                length++;
                pos++; // skip the escaped character provided that the file didn't end after the original backslash
            }
            continue;
        }
        length++;
        pos++;
    }

    if (seenLineFeed && terminator === js_BACKTICK) {
        trackedSyntaxList.insert(trackedSyntaxList.count_abstract, TrackedSyntaxKind.String, start, length);
    }

    return pos;
}

function JS_line_lex(div, substart, lineEnd, childIndex) {
    let length = 0;
    let pos = substart;

    let bytes = EDITOR_textByteList.bytes;

    while (pos < lineEnd) {
        switch (bytes[pos]) {
            case 97:  // a
            case 98:  // b
            case 99:  // c
            case 100: // d
            case 101: // e
            case 102: // f
            case 103: // g
            case 104: // h
            case 105: // i
            case 106: // j
            case 107: // k
            case 108: // l
            case 109: // m
            case 110: // n
            case 111: // o
            case 112: // p
            case 113: // q
            case 114: // r
            case 115: // s
            case 116: // t
            case 117: // u
            case 118: // v
            case 119: // w
            case 120: // x
            case 121: // y
            case 122: // z
            case 65:  // A
            case 66:  // B
            case 67:  // C
            case 68:  // D
            case 69:  // E
            case 70:  // F
            case 71:  // G
            case 72:  // H
            case 73:  // I
            case 74:  // J
            case 75:  // K
            case 76:  // L
            case 77:  // M
            case 78:  // N
            case 79:  // O
            case 80:  // P
            case 81:  // Q
            case 82:  // R
            case 83:  // S
            case 84:  // T
            case 85:  // U
            case 86:  // V
            case 87:  // W
            case 88:  // X
            case 89:  // Y
            case 90:  // Z
            case 95:  // _
                let wordstart = pos;

                // you don't know if a word is a keyword until you've read the keyword.
                // so until that point you're tracking it along with all the other text/whitespace on the line
                // and planning to make everything just a single span.

                let charIntSum = 0;

                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case 97:  // a
                        case 98:  // b
                        case 99:  // c
                        case 100: // d
                        case 101: // e
                        case 102: // f
                        case 103: // g
                        case 104: // h
                        case 105: // i
                        case 106: // j
                        case 107: // k
                        case 108: // l
                        case 109: // m
                        case 110: // n
                        case 111: // o
                        case 112: // p
                        case 113: // q
                        case 114: // r
                        case 115: // s
                        case 116: // t
                        case 117: // u
                        case 118: // v
                        case 119: // w
                        case 120: // x
                        case 121: // y
                        case 122: // z
                        case 65:  // A
                        case 66:  // B
                        case 67:  // C
                        case 68:  // D
                        case 69:  // E
                        case 70:  // F
                        case 71:  // G
                        case 72:  // H
                        case 73:  // I
                        case 74:  // J
                        case 75:  // K
                        case 76:  // L
                        case 77:  // M
                        case 78:  // N
                        case 79:  // O
                        case 80:  // P
                        case 81:  // Q
                        case 82:  // R
                        case 83:  // S
                        case 84:  // T
                        case 85:  // U
                        case 86:  // V
                        case 87:  // W
                        case 88:  // X
                        case 89:  // Y
                        case 90:  // Z
                        case 95:  // _
                        case 48:  // 0
                        case 49:  // 1
                        case 50:  // 2
                        case 51:  // 3
                        case 52:  // 4
                        case 53:  // 5
                        case 54:  // 6
                        case 55:  // 7
                        case 56:  // 8
                        case 57:  // 9
                            charIntSum += bytes[pos];
                            length++;
                            pos++;
                            break;
                        default:
                            break outer;
                    }
                }
                // heuristic for possible keyword is comparing char int sum:
                //
                // const
                // c 99
                // o 111
                // n 110
                // s 115
                // t 116
                //
                // 551
                // 
                let className;
                let innerText;
                let wordlength = pos - wordstart;
                switch (charIntSum) {
                    case 551: // const
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */ &&
                            bytes[wordstart + 4] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'const';
                                break;
                        }
                        className = '';
                        break;
                    case 325: // let
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 108 /* 'l' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'let';
                                break;
                        }
                        className = '';
                        break;
                    case 870: // function
                        if (wordlength === 8 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 117 /* 'u' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 99  /* 'c' */ &&
                            bytes[wordstart + 4] === 116 /* 't' */ &&
                            bytes[wordstart + 5] === 105 /* 'i' */ &&
                            bytes[wordstart + 6] === 111 /* 'o' */ &&
                            bytes[wordstart + 7] === 110 /* 'n' */) {
                                className = 'eK';
                                innerText = 'function';
                                break;
                        }
                        className = '';
                        break;
                    case 207: // if
                        if (wordlength === 2 &&
                            bytes[wordstart + 0] === 105 /* 'i' */ &&
                            bytes[wordstart + 1] === 102 /* 'f' */) {
                                className = 'eKC';
                                innerText = 'if';
                                break;
                        }
                        className = '';
                        break;
                    case 351: // try
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 121 /* 'y' */) {
                                className = 'eK';
                                innerText = 'try';
                                break;
                        }
                        className = '';
                        break;
                    case 327: // for
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */) {
                                className = 'eKC';
                                innerText = 'for';
                                break;
                        }
                        className = '';
                        break;
                    case 329: // var
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 118 /* 'v' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */) {
                                className = 'eK';
                                innerText = 'var';
                                break;
                        }
                        className = '';
                        break;
                    case 515: // catch
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */ &&
                            bytes[wordstart + 3] === 99  /* 'c' */ &&
                            bytes[wordstart + 4] === 104 /* 'h' */) {
                                className = 'eK';
                                innerText = 'catch';
                                break;
                        }
                        className = '';
                        break;
                    case 672: // return
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 114 /* 'r' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */ &&
                            bytes[wordstart + 3] === 117 /* 'u' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 110 /* 'n' */) {
                                className = 'eKC';
                                innerText = 'return';
                                break;
                        }
                        className = '';
                        break;
                    case 658: // switch
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 115 /* 's' */ &&
                            bytes[wordstart + 1] === 119 /* 'w' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 116 /* 't' */ &&
                            bytes[wordstart + 4] === 99  /* 'c' */ &&
                            bytes[wordstart + 5] === 104 /* 'h' */) {
                                className = 'eKC';
                                innerText = 'switch';
                                break;
                        }
                        className = '';
                        break;
                    case 412: // case
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 115 /* 's' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'case';
                                break;
                        }
                        className = '';
                        break;
                    case 542: // async
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 97  /* 'a' */ &&
                            bytes[wordstart + 1] === 115 /* 's' */ &&
                            bytes[wordstart + 2] === 121 /* 'y' */ &&
                            bytes[wordstart + 3] === 110 /* 'n' */ &&
                            bytes[wordstart + 4] === 99  /* 'c' */) {
                                className = 'eK';
                                innerText = 'async';
                                break;
                        }
                        className = '';
                        break;
                    case 425: // else
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 101 /* 'e' */ &&
                            bytes[wordstart + 1] === 108 /* 'l' */ &&
                            bytes[wordstart + 2] === 115 /* 's' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'else';
                                break;
                        }
                        className = '';
                        break;
                    case 741: // default
                        if (wordlength === 7 &&
                            bytes[wordstart + 0] === 100 /* 'd' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 102 /* 'f' */ &&
                            bytes[wordstart + 3] === 97  /* 'a' */ &&
                            bytes[wordstart + 4] === 117 /* 'u' */ &&
                            bytes[wordstart + 5] === 108 /* 'l' */ &&
                            bytes[wordstart + 6] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'default';
                                break;
                        }
                        className = '';
                        break;
                    case 564: // throw
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 119 /* 'w' */) {
                                className = 'eK';
                                innerText = 'throw';
                                break;
                        }
                        className = '';
                        break;
                    case 330: // new
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 110 /* 'n' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 119 /* 'w' */) {
                                className = 'eK';
                                innerText = 'new';
                                break;
                        }
                        className = '';
                        break;
                    case 534: // class
                        if (wordlength === 5) {
                            if (bytes[wordstart + 0] === 97  /* 'a' */ &&
                                bytes[wordstart + 1] === 119 /* 'w' */ &&
                                bytes[wordstart + 2] === 97  /* 'a' */ &&
                                bytes[wordstart + 3] === 105 /* 'i' */ &&
                                bytes[wordstart + 4] === 116 /* 't' */) {
                                
                                    className = 'eK';
                                	innerText = 'await';
                                    break;
                            }
                            else if (bytes[wordstart + 0] === 99  /* 'c' */ &&
                                     bytes[wordstart + 1] === 108 /* 'l' */ &&
                                     bytes[wordstart + 2] === 97  /* 'a' */ &&
                                     bytes[wordstart + 3] === 115 /* 's' */ &&
                                     bytes[wordstart + 4] === 115 /* 's' */) {

                                    className = 'eK';
                                	innerText = 'class';
                                    break;
                            }
                        }
                        className = '';
                        break;
                    case 1222: // constructor
                        if (wordlength === 11 &&
                            bytes[wordstart + 0] === 99   /* 'c' */ &&
                            bytes[wordstart + 1] === 111  /* 'o' */ &&
                            bytes[wordstart + 2] === 110  /* 'n' */ &&
                            bytes[wordstart + 3] === 115  /* 's' */ &&
                            bytes[wordstart + 4] === 116  /* 't' */ &&
                            bytes[wordstart + 5] === 114  /* 'r' */ &&
                            bytes[wordstart + 6] === 117  /* 'u' */ &&
                            bytes[wordstart + 7] === 99   /* 'c' */ &&
                            bytes[wordstart + 8] === 116  /* 't' */ &&
                            bytes[wordstart + 9] === 111  /* 'o' */ &&
                            bytes[wordstart + 10] === 114 /* 'r' */) {
                                className = 'eK';
                                innerText = 'constructor';
                                break;
                        }
                        className = '';
                        break;
                    case 667: // import
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 105 /* 'i' */ &&
                            bytes[wordstart + 1] === 109 /* 'm' */ &&
                            bytes[wordstart + 2] === 112 /* 'p' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 116 /* 't' */) {
                                className = 'eKC';
                                innerText = 'import';
                                break;
                        }
                        className = '';
                        break;
                    case 436: // from
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 111 /* 'o' */ &&
                            bytes[wordstart + 3] === 109 /* 'm' */) {
                                className = 'eKC';
                                innerText = 'from';
                                break;
                        }
                        className = '';
                        break;
                    case 674: // export
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 101 /* 'e' */ &&
                            bytes[wordstart + 1] === 120 /* 'x' */ &&
                            bytes[wordstart + 2] === 112 /* 'p' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'export';
                                break;
                        }
                        className = '';
                        break;
                    case 440: // this
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */) {
                                className = 'eK';
                                innerText = 'this';
                                break;
                        }
                        className = '';
                        break;
                    case 537: // while
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 119 /* 'w' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 108 /* 'l' */ &&
                            bytes[wordstart + 4] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'while';
                                break;
                        }
                        className = '';
                        break;
                    case 517: // break
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 98  /* 'b' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 101 /* 'e' */ &&
                            bytes[wordstart + 3] === 97  /* 'a' */ &&
                            bytes[wordstart + 4] === 107 /* 'k' */) {
                                className = 'eKC';
                                innerText = 'break';
                                break;
                        }
                        className = '';
                        break;
                    case 869: // continue
                        if (wordlength === 8 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 116 /* 't' */ &&
                            bytes[wordstart + 4] === 105 /* 'i' */ &&
                            bytes[wordstart + 5] === 110 /* 'n' */ &&
                            bytes[wordstart + 6] === 117 /* 'u' */ &&
                            bytes[wordstart + 7] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'continue';
                                break;
                        }
                        className = '';
                        break;
                    case 448: // true
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 117 /* 'u' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eK';
                                innerText = 'true';
                                break;
                        }
                        className = '';
                        break;
                    case 523: // false
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 108 /* 'l' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */ &&
                            bytes[wordstart + 4] === 101 /* 'e' */) {
                                className = 'eK';
                                innerText = 'false';
                                break;
                        }
                        className = '';
                        break;
                    case 443: // null
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 110 /* 'n' */ &&
                            bytes[wordstart + 1] === 117 /* 'u' */ &&
                            bytes[wordstart + 2] === 108 /* 'l' */ &&
                            bytes[wordstart + 3] === 108 /* 'l' */) {
                                className = 'eK';
                                innerText = 'null';
                                break;
                        }
                        className = '';
                        break;
                    default:
                        className = '';
                        break;
                }
                if (className) {
                    // is done when there IS a valid match, in order to write out any pending text that came prior to the keyword.
                    if (length > wordlength) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + (length - wordlength)));
                        substart += (length - wordlength);
                        length = 0;
                    }
                    {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = innerText;
                    span.className = className;
                    substart += wordlength;
                    length = 0;
                    }
                }
                continue;
            case js_FORWARDSLASH:
                if (bytes[pos + 1] === js_FORWARDSLASH) {

                    if (length > 0) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }

                    // lex_comment_singleLine(...)

                    // The current character is the first forward slash of the 'two consecutive ones' that represent the start of a single line comment.
                    // "changing" this to guarantee at least 1 read means you can continue after the invocation returns (for the while loop)
                    // All in all, this already was guaranteed to read at least 1 since the while loop's condition in this method
                    // This change is moreso a matter of anxiety and me not wanting to deal with this at the moment so I need to see the explicit read here so I can sleep at night for the time being until my stress levels are lower.
                    length++;
                    pos++;
                    while (pos < lineEnd) {
                        if (bytes[pos] === js_LINEFEED) {
                            break;
                        }
                        length++;
                        pos++;
                    }

                    if (length > 0) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            //span.className = ''; className is guaranteed to be set in this specific case
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        span.className = 'eC';
                        substart += length;
                        length = 0;
                    }

                    continue;
                }
                else if (bytes[pos + 1] === js_ASTERISK) {
                    if (length > 0) { // write any text that came prior, and on the same line.
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }

                    // Move past the 'forwardslash and asterisk'
                    length += 2;
                    pos += 2;

                    // I'm starting this at 2 because 0 would bug (-1 + 1 === 0)
                    // but then I just don't want to deal with this so I need to go 1,
                    // then like I'm tired and I don't want to deal with this so I'll just go to 2 and surely nothing bad can happen
                    // but in reality I probably only need to start at 1 (or start of other ticket variables + 2 or something idk I don't wanna deal with this right now).
                    let ticketSource = 2;
                    let ticketAsterisk = -1;
                    let ticketForwardSlash = -1;
                    while (pos < lineEnd) {
                        switch (bytes[pos]) {
                            case js_ASTERISK:
                                ticketAsterisk = ticketSource++;
                                break;
                            case js_FORWARDSLASH:
                                ticketForwardSlash = ticketSource++;
                                break;
                            case js_LINEFEED:
                                ticketSource++;
                                break;
                            default:
                                ticketSource++;
                                break;
                        }
                        length++;
                        pos++;
                        if (ticketAsterisk + 1 === ticketForwardSlash) {
                            break;
                        }
                    }

                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    //
                    // The spans are being parentDiv.innerHTML = '' into oblivion maybe take them and push them somewhere cache
                    // for when remaking new line or you keep them and replace innerText and cssclass and only remove spans AFTER redrawing that line?
                    // 
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    span.className = 'eCm';
                    substart += length;
                    length = 0;

                    continue;
                }

                break;
            case js_DOUBLEQUOTE:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_DOUBLEQUOTE:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eS';
                substart += length;
                length = 0;
                continue;
                }
            case js_SINGLEQUOTE:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_SINGLEQUOTE:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eS';
                substart += length;
                length = 0;
                continue;
                }
            case js_BACKTICK:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_BACKTICK:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eSm';
                substart += length;
                length = 0;
                continue;
                }
            case js_EQUALS:
                {
                	// TODO: >= and etc... I'm very tired and I'm not doing it right now it is syntax highlighting the '=' erroneously.
                	/*
                	 If you solve the above todo by adding a case to this switch that handles '>' and skips over a next '=' character if contiguous...
                	 you're incurring more jumps among the source code and presumably mucking the "code cache" and I don't entirely understand how it works
                	 but that's my intuition for what I'm gonna do.
                	 
                	 I'm going to instead have the '=' case handle two character operators of which an '=' appears as the second character.
                	 A main reason for this is: there's a limited amount of cases, and I think the count of cases is extremely minimal.
                	*/
                
                	/*
TODO: I just made this multiline comment that spans multiple lines, if you actually type text between the delimiters it enter keys...
...and multiline spanning syntax highlights properly? Because I notice this doesn't always work, and I think it's when I type just the delimiters then press enter key between them
if you're off by 1 when determining to remove multi-line spanning syntax then that would likely be an issue and possibly the cause.

# "done":
=


# TODO:
+=
++
-=
--
*=
/=
%=
**=
&=
&&=
|=
||=
??=
^=
<<=
>>=
>>>=
                	*/
                	
                
                // I think I actually want to handle the '==', '===', and '===...=' cases just so I can skip over the text quickly.
                // Otherwise every time I see '=' I have to check the left and right side and it is quite redundant?
                //
                // I also have to consider anything of the form '+=' then typing '=' after it for '+=='. I don't think this is valid but I need to consider it I'll probably skip over any '=' that appear after the first '+=' text and is contiguous?
                // No that doesn't work because you're adding this step to every syntax that ends in '=' that it has to understand the '=' case.
                // What you want is a left check, but that the left check only happens once per contiguous block of '=' incase the left '=' isn't part of your syntax.
                //
                
                // NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in ="...
                // ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
                
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                	//
                	// TODO: If this contiguous skipping logic works for the '=' it will handle both '!=' and '!==' solely by checking for '!='
                	//
                	let shouldSkipContiguous;
            		if (pos > substart) {
            			if (bytes[pos - 1] === js_EQUALS) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_BANG) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_OPENBRACKET) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_CLOSEBRACKET) {
            				shouldSkipContiguous = true;
            			}
            		}
            		else {
            			shouldSkipContiguous = false;
            		}
                	if (!shouldSkipContiguous) {
                		if (pos < lineEnd && bytes[pos + 1] === js_EQUALS) {
                			shouldSkipContiguous = true;
                		}
                	}
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_EQUALS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    // I don't know if I would count '=>' as an "assignment operator"... maybe I would but I'm too focused on whether I'd count it as such that I can't figure out the way to make it work. So I need to just make it work first.
	                    length++;
                        pos++;
                        let innerText;
                        if (pos < lineEnd && bytes[pos] === js_CLOSEBRACKET) {
                        	innerText = '=>';
                        	length++;
                        	pos++;
                        }
                        else {
                        	innerText = '=';
                        }
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                    
                    // TODO: you don't understand how code caching or like instruction caching etc works with respect to whether inlining interupts things
                    break;
                }
            case js_PLUS:
                {
                	// ++
                	// +=
                	
                	// If "some syntax that I don't actually think exists" such as '=+' were to exist I'd need to care for '=+' then a '+' making '=++'
                	// this should cause a skipping of contiguous '+' in my initial opinion so that's what I'll probably do.
                	// 
                	// I have a better example now... '++' then you type '+' causing '+++', the first two '++' are syntax highlighted and the third isn't.
                	// Some might say you should not syntax highlight any of the plus in that case because you're reading the operator as '++'
                	// rather than the combination of '++' and '+'. I think I'm somewhat indifferent but I lean towards syntax highlighting
                	// the two plus characters and not doing so for the final '+' (at least my initial opinion is that).
                	//
                	// ++++
                	// It doesn't actually work... I tried it and '+++' works but then '++++' is two '++' rather than one '++' and then just the "text of '++'".
                	//
                	
                	// NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in +"...
            		// ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
                	
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                    let shouldSkipContiguous = pos > substart && bytes[pos - 1] === js_PLUS;
                    let innerText;
                    if (!shouldSkipContiguous) {
                    	if (pos < lineEnd) {
                    		if (bytes[pos + 1] === js_PLUS) {
	                    		innerText = '++';
	                    	}
	                    	else if (bytes[pos + 1] === js_EQUALS) {
	                    		innerText = '+=';
	                    	}
	                    	else {
	                    		shouldSkipContiguous = true;
	                    	}
                    	}
                    	else {
                    		shouldSkipContiguous = true;
                    	}
                    }
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_PLUS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    length += 2;
                        pos += 2;
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                }
            case js_MINUS:
                {
                	// --
                	// -=
                	
                	// NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in -"...
            		// ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
            		
            		// When you switch on '+' then check for '-' or '+'... should you do something relating to NOT invoking the decode function and instead
            		// you just "know" the text that goes there based on your conditional branching?
                	 
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                    let shouldSkipContiguous = pos > substart && bytes[pos - 1] === js_MINUS;
                	let innerText;
                    if (!shouldSkipContiguous) {
                    	if (pos < lineEnd) {
                    		if (bytes[pos + 1] === js_MINUS) {
	                    		innerText = '--';
	                    	}
	                    	else if (bytes[pos + 1] === js_EQUALS) {
	                    		innerText = '-=';
	                    	}
	                    	else {
	                    		shouldSkipContiguous = true;
	                    	}
                    	}
                    	else {
                    		shouldSkipContiguous = true;
                    	}
                    }
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_MINUS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    length += 2;
                        pos += 2;
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                }
            /*case js_PERIOD:
            	{
                    if (length > 0) { // write any text that came prior, and on the same line.
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }
                    
                    outer: while (pos < lineEnd) {
                        switch (bytes[pos]) {
                            case js_PERIOD:
                                length++;
                                pos++;
                                break;
                            default:
                                break outer;
                        }
                    }
                    
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    span.className = 'eM';
                    substart += length;
                    length = 0;

                    continue;
                }*/
            /*case js_OPENPARENTHESIS:
            case js_CLOSEPARENTHESIS:
                {
                    if (length > 0) { // write any text that came prior, and on the same line.
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }
                    
                    outer: while (pos < lineEnd) {
                        switch (bytes[pos]) {
                            case js_OPENPARENTHESIS:
                            case js_CLOSEPARENTHESIS:
                                length++;
                                pos++;
                                break;
                            default:
                                break outer;
                        }
                    }
                    
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    span.className = 'eP';
                    substart += length;
                    length = 0;

                    continue;
                }*/
        }
        length++;
        pos++;
    }

    if (length > 0) {
        let span;
        if (childIndex < div.children.length) {
            span = div.children[childIndex++];
            span.className = '';
        }
        else {
            span = document.createElement('span');
            div.appendChild(span);
            childIndex++;
        }
        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
    }

    return childIndex;
}
