module.exports.numberWithPoints = (x) => {
    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if(parts.length > 1 && parts[1].length > 2)
        parts[1] = parts[1].substring(0, 2);
    return parts.join(",");
}