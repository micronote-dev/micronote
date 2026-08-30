export namespace main {
	
	export class FileTree {
	    type: string;
	    name: string;
	    path: string;
	    children?: FileTree[];
	
	    static createFrom(source: any = {}) {
	        return new FileTree(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.children = this.convertValues(source["children"], FileTree);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IssueValidation {
	    field: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new IssueValidation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.field = source["field"];
	        this.message = source["message"];
	    }
	}
	export class Subissue {
	    title: string;
	    completed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Subissue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.completed = source["completed"];
	    }
	}
	export class Issue {
	    path: string;
	    position: number;
	    title: string;
	    status: string;
	    limit_date?: string;
	    description: string;
	    subissues: Subissue[];
	    validation_errors: IssueValidation[];
	
	    static createFrom(source: any = {}) {
	        return new Issue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.position = source["position"];
	        this.title = source["title"];
	        this.status = source["status"];
	        this.limit_date = source["limit_date"];
	        this.description = source["description"];
	        this.subissues = this.convertValues(source["subissues"], Subissue);
	        this.validation_errors = this.convertValues(source["validation_errors"], IssueValidation);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IssueUpdate {
	    title: string;
	    status: string;
	    limit_date?: string;
	    description: string;
	    subissues: Subissue[];
	
	    static createFrom(source: any = {}) {
	        return new IssueUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.status = source["status"];
	        this.limit_date = source["limit_date"];
	        this.description = source["description"];
	        this.subissues = this.convertValues(source["subissues"], Subissue);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class UserConfig {
	    keybindings?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new UserConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.keybindings = source["keybindings"];
	    }
	}

}

