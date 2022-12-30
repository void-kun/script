const a = document.querySelectorAll('.author-item');
Array.prototype.slice
  .call(document.querySelectorAll('.book-list-wrapper .stats-col'))
  .map((ele, i) => {
    if (!ele['children'][0]['children'][1].textContent.match(/[mk]/)) {
      a[i].remove();
    }
  });
