export function extractJson(str) {
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("Couldn't find JSON object in response");
    return str.slice(start, end + 1);
}