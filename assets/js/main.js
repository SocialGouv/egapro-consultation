const config = {
  apiUrl: 'https://dev.egapro.fabrique.social.gouv.fr/api'
}

function api(method, uri) {
  return request(method, `${config.apiUrl}${uri}`)
}

///////////
/* State */
///////////

const state = {
  csv_update: undefined,
  current_year: (new Date()).getFullYear() - 1,
  stats: { count: 0, avg: 0, min: 0, max: 0 },
  results: { count: 0, data: [] },
  config: {},
  filters: new URLSearchParams(),
}

async function init() {
  const responseCsv = await request('head', "/index-egalite-fh.csv")
  const lastModified = new Date(responseCsv.headers.get('last-modified'))
  state.csv_update = lastModified.toLocaleDateString()
  const responseConfig = await api('get', "/config")
  state.config = responseConfig.data

  // Start page router
  page({ hashbang: true })
}

////////////////
/* Templating */
////////////////

const template = document.body.innerHTML
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')

function render() {
  // First rendering, avoid first load flash glitch
  if(!document.body.classList.contains('ready')) document.body.classList.add('ready')

  document.body.innerHTML = ejs.render(template, state)

  // Handle form submition to redirect to hash
  Array.from(document.querySelectorAll('form')).forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      submitForm(form)
    })
  })

  // Boolean attributes cannot be propertly rendered with this template engine
  // They are therefore rendered as `selected="true"` and should be cleaned up
  document.querySelectorAll('[selected]').forEach(node => {
    const attr = node.getAttribute('selected')
    if(attr === 'false') {
      node.selected = false
      node.removeAttribute('selected')
    }
    else if(attr === 'true') {
      node.selected = true
    }
  })
}

function calculateIndex(form) {
  const next = new URL(location)
  next.hash = "#!/home"
  submitForm(form, next.toString())
}

function submitForm(form, url) {
  const queryParams = new URLSearchParams(new FormData(form))
  normalizeQueryParams(queryParams)
  const pathname = new URL(url || form.action).hash
  page(`${pathname}?${queryParams}`)
}

function normalizeQueryParams(params) {
  const region = params.get("region")
  const departement = params.get("departement")
  if (region && departement &&
      !state.config.REGIONS_TO_DEPARTEMENTS[region].includes(departement)) {
    params.set("departement", "")
  }
}

function queryFilters(query) {
  const paramsWithValue = new URLSearchParams(Array.from(query).filter(pair => pair[1]))
  return Array.from(paramsWithValue.entries()).reduce((filters, [key, value]) => {
      filters[key] = value
      return filters
    }, {})
}


/////////////////
/* Controllers */
/////////////////

// Enable query params for router. This must remain before specific routes.
page('*', (req, next) => {
  req.query = new URLSearchParams(req.path.split('?')[1])
  req.filters = new URLSearchParams(Array.from(req.query).filter(pair => pair[1]))
  next()
})

page('/', home)
page('/home', home)
async function home(req) {
  const response = await api('get', `/search?${req.filters}`)
  state.stats = response.data
  state.filters = req.filters
  state.current_page = 'home'
  render()
}

page('/search', async (req) => {
  const filters = req.filters
  const page = Number(filters.get('page'))

  // Pagination
  if(page) {
    filters.set('offset', page * 10)
    filters.delete('page')
  }

  const response = await api('GET', `/search?${filters}`)
  const data = response.data.data

  // Update state
  Object.assign(state, {
    current_page: 'search',
    stats: response.data,
    results: {
      count: response.data.count,
      data: page ? state.results.data.concat(data) : data
    },
    filters
  })
  render()
})

page('*', () => {
  state.current_page = '404'
  render()
})

function moreResults() {
  const queryParams = new URLSearchParams(page.current.split('?')[1])
  queryParams.set('page', Number(queryParams.get('page') || 1) + 1)
  page.redirect(`/search?${queryParams}`)
}

init()
