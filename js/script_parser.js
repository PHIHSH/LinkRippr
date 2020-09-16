class ScriptParser{

    constructor(script){
        if(script.tokenType !== DOMTokenType.SCRIPT){
            throw "ScriptParser cannot parse content of DOMTokenType." + script.tokenType;
        }
        this.signatures = userSettings.signatures;
        this.script = new Script(script.value);
        this.parseScript();
    }

    parseScript(){
        if(this.script.statements != null){
            let statements = this.script.statements
            for(let i in statements){
                statements[i].checkForSignatures(this.signatures);
                statements[i].attemptToDeobfuscate();
                statements[i].attemptDomExtraction(this.signatures);
            }
        }
    }

}

class Script{
    constructor(raw) {
        this._raw = raw;
        this.statements = null;
        this.breakIntoStatements();
    }

    breakIntoStatements(){

        if(this._raw.trim().length === 0){
            return;
        }else{
            this.statements = [];
        }

        //pseudo-tokens
        const PREVIOUS = 0;
        const CURRENT = 1;
        const NEXT = 2;
        const NEW_LINE = '\n';
        const END_STATEMENT = ';';
        const ESCAPE = '\\';
        const CODE_BLOCK_OPEN = '{';
        const CODE_BLOCK_CLOSE = '}';
        const SINGLE_LINE_COMMENT = '//';
        const ML_COMMENT_OPEN = '/*';
        const ML_COMMENT_CLOSE = '*/';
        const SINGLE_QUOTE = '\'';
        const DOUBLE_QUOTE = "\"";
        const OPEN_PAREN = "(";
        const CLOSE_PAREN = ")";

        //in conditionals
        let inMLComment = false;
        let inSingleComment = false;
        let inString = false;

        //depth counters
        let depthParen = 0;
        let depthCodeBlock = 0;

        let quoteType = SINGLE_QUOTE;
        let statement = '';
        for(let i=0; i<this._raw.length; i++){
            let buffer = this.setBuffer(i);

            if(i === this._raw.length - 1){ //Check for the end of _raw
                statement += buffer[CURRENT];
                if(statement.trim().length > 0){
                    this.statements.push(new Statement(stripNewLines(statement.trim())));
                }
            }else if(inString){
                statement += buffer[CURRENT];
                if(buffer[PREVIOUS] !== ESCAPE && ((buffer[CURRENT] === DOUBLE_QUOTE && quoteType === DOUBLE_QUOTE) ||
                    (buffer[CURRENT] === SINGLE_QUOTE && quoteType === SINGLE_QUOTE))){
                    quoteType = null;
                    inString = false;
                }
            }else if(inSingleComment){ //Check for single line comment exit
                if(buffer[CURRENT] === NEW_LINE){
                    inSingleComment = false;
                }
            }else if(inMLComment){ //Check for multi-line comment exit
                if(buffer[PREVIOUS] + buffer[CURRENT] === ML_COMMENT_CLOSE){
                    inMLComment = false;
                }
            }else if(buffer[PREVIOUS] !== ESCAPE){ //Interpret everything in this block as if NOT a string literal
                if(buffer[CURRENT] === DOUBLE_QUOTE){
                    statement += buffer[CURRENT];
                    quoteType = DOUBLE_QUOTE;
                    inString = true;
                }else if(buffer[CURRENT] === SINGLE_QUOTE){
                    statement += buffer[CURRENT];
                    quoteType = SINGLE_QUOTE;
                    inString = true;
                }else if(buffer[CURRENT] === CODE_BLOCK_OPEN){
                    statement += buffer[CURRENT];
                    depthCodeBlock++;
                }else if(buffer[CURRENT] === CODE_BLOCK_CLOSE){
                    statement += buffer[CURRENT];
                    depthCodeBlock--;
                }else if(buffer[CURRENT] === OPEN_PAREN){
                    statement += buffer[CURRENT];
                    depthParen++;
                }else if(buffer[CURRENT] === CLOSE_PAREN){
                    statement += buffer[CURRENT];
                    depthParen--;
                }else if(buffer[CURRENT] + buffer[NEXT] === SINGLE_LINE_COMMENT){
                    inSingleComment = true;
                }else if(buffer[CURRENT] + buffer[NEXT] === ML_COMMENT_OPEN){
                    inMLComment = true;
                }else if(buffer[CURRENT] === NEW_LINE){
                    if(statement.trim().length > 0 && depthCodeBlock === 0 && depthParen === 0){
                        if(statement.trim().length > 0){
                            this.statements.push(new Statement(stripNewLines(statement.trim() + END_STATEMENT)));
                            statement = '';
                        }
                    }
                }else if(buffer[CURRENT] === END_STATEMENT){
                    if(statement.trim().length > 0 && depthCodeBlock === 0 && depthParen === 0){
                        if(statement.trim().length > 0){
                            this.statements.push(new Statement(stripNewLines(statement.trim() + END_STATEMENT)));
                            statement = '';
                        }
                    }else{
                        statement += buffer[CURRENT];
                    }
                }else{
                    statement += buffer[CURRENT];
                }
            }else{
                statement += buffer[CURRENT];
            }
        }

    }

    setBuffer(currentIdx){
        return [
            (currentIdx > 0)?this._raw.charAt(currentIdx - 1):null,
            this._raw.charAt(currentIdx),
            (currentIdx < this._raw.length - 1)?this._raw.charAt(currentIdx + 1):null
        ];
    }
}

class Statement{
    constructor(raw){
        this._raw = raw;
        this.signatureHits = []; //{"signature":"signature_name","tag":"content","deob_success":false,"deob_content":"deobfuscation"}
        this.domExtractions = [];
    }

    checkForSignatures(signatures){
        for(let key in signatures){
            let global = new RegExp(signatures[key]["pattern"],"g");
            let sticky = new RegExp(signatures[key]["pattern"],"y");
            let tmp = this._raw;
            while(global.test(tmp)){

                //locate the matching substring
                let stickyIdx = 0;
                sticky.lastIndex = stickyIdx;
                while(!sticky.test(tmp)){
                    stickyIdx++;
                    sticky.lastIndex = stickyIdx;
                }
                let lastIdx = stickyIdx + 1;
                let tmpSub = tmp.substring(stickyIdx, lastIdx);
                while(!sticky.test(tmpSub)){
                    lastIdx++;
                    tmpSub = tmp.substring(stickyIdx, lastIdx);
                }

                //add the substring as a tag to signatureHits
                this.signatureHits.push({
                    "signature":key,
                    "tag":this._raw.substring(stickyIdx, lastIdx),
                    "deob_success":false,
                    "deob_content":null
                });

                //debugging
                console.log("Found signature \"" + key + "\". Matching value = " + this._raw.substring(stickyIdx, lastIdx));

                //trim tmp
                tmp = tmp.substring(lastIdx);
            }
        }
    }

    attemptToDeobfuscate(){
        if(this.signatureHits.length > 0){

        }

    }

    attemptDomExtraction(signatures){
        if(this.signatureHits.length > 0){

        }
    }

    prettyPrint(){

    }
}