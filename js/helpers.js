
// this works with twitter card/fb:og and the other socials to make that gray arrow at upper right
function toggle_visibility(id) {
  var e = document.getElementById(id);
  if (e.style.display == 'inline-block') e.style.display = 'none';else e.style.display = 'inline-block';
}

function classify(string){
  return string.replace(/\W+/g, '-').toLowerCase();
}
