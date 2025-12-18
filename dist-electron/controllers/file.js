"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTextFile = writeTextFile;
exports.readTextFile = readTextFile;
const fs_1 = __importDefault(require("fs"));
async function writeTextFile({ payload }) {
    const { filePath, content } = payload;
    await new Promise((resolve, reject) => {
        fs_1.default.writeFile(filePath, content, "utf-8", (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
    return true;
}
async function readTextFile(filePath) {
    const text = await fs_1.default.promises.readFile(filePath, "utf-8");
    return text;
}
