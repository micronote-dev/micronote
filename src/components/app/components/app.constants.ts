export type TreeType ={
    id?:string
    type: string;
    name: string;
    path: string;
    children?: TreeType[];
}

export const TreeType = {
    DIR: "directory",
    FILE: "file",
}