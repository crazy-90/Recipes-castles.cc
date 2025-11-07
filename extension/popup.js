document.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('recipes.json');
  const recipes = await response.json();

  const searchInput = document.getElementById('search');
  const results = document.getElementById('results');
  const searchContainer = document.getElementById('searchContainer');
  const viewer = document.getElementById('viewer');
  const frame = document.getElementById('recipeFrame');
  const backBtn = document.getElementById('backBtn');

  function showResults(query) {
    results.innerHTML = '';
    const filtered = recipes.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length > 0) {
      results.classList.add('show');

      // Dynamically adjust height based on number of results (max 400px)
      const rowHeight = 36; // approximate height of a <li>
      const totalHeight = Math.min(rowHeight * filtered.length + 75, 400 + 75);
      document.body.style.height = `${totalHeight}px`;
    } else {
      results.classList.remove('show');
      document.body.style.height = '75px'; // shrink back to search bar only
    }

    filtered.forEach(recipe => {
      const li = document.createElement('li');
      li.textContent = recipe.name;
      li.addEventListener('click', () => openRecipe(recipe.file));
      results.appendChild(li);
    });
  }

  function openRecipe(url) {
    frame.src = url;
    searchContainer.style.display = 'none';
    viewer.style.display = 'block';
    document.body.style.height = '740px';
  }

  backBtn.addEventListener('click', () => {
    viewer.style.display = 'none';
    searchContainer.style.display = 'block';
    document.body.style.height = '75px';
  });

  searchInput.addEventListener('input', e => showResults(e.target.value));

  // Hide results initially
  results.classList.remove('show');
  document.body.style.height = '75px';
});
