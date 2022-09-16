const a = document.querySelectorAll('.author-item'); 
Array.prototype.slice.call(document.querySelectorAll('.stats-col'))
.filter(ele => ele?.children.length > 0)
.map((ele, i) => {
  if (!ele['children'][0]['children'][1].textContent.match(/[mk]/)) {
    a[i].remove()
  }
});
