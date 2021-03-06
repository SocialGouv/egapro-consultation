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
  offset: 0,
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
  setLoading(true)
  state.offset = 0
  const queryParams = formToURLSearchParams(form)
  normalizeQueryParams(queryParams)
  const pathname = new URL(url || form.action).hash
  page(`${pathname}?${queryParams}`)
}

function formToURLSearchParams(form) {
  // We don't use `const queryParams = new URLSearchParams(new FormData(form))`
  // because EdgeHTML can't cope with it
  const formData = new FormData(form)
  const filters = {}
  Array.from(formData).forEach(key => {
    filters[key] = formData.get(key)
  })
  return new URLSearchParams(filters)
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

  // If we just landed on the home page, make sure it's scrolled back to the top
  if (state.current_page !== 'home') {
    document.getElementsByTagName("html")[0].scrollTop = 0
  }

  state.current_page = 'home'
  render()
  setLoading(false)
}

page('/search', async (req) => {
  const filters = req.filters

  // Pagination
  if(state.offset) {
    filters.set('offset', state.offset)
  }

  const response = await api('GET', `/search?${filters}`)
  const data = response.data.data

  // If we just landed on the search page, make sure it's scrolled back to the top
  if (state.current_page !== 'search') {
    document.getElementsByTagName("html")[0].scrollTop = 0
  }

  // Update state
  Object.assign(state, {
    current_page: 'search',
    stats: response.data,
    results: {
      count: response.data.count,
      data: state.offset ? state.results.data.concat(data) : data
    },
    filters
  })
  render()
  setLoading(false)
})

page('*', () => {
  state.current_page = '404'
  render()
})

function moreResults() {
  setLoading(true)
  state.offset += 10
  const queryParams = new URLSearchParams(page.current.split('?')[1])
  page.redirect(`/search?${queryParams}`)
}

function setLoading(loading) {
  if (loading) {
    if (!document.body.classList.contains('loading')) document.body.classList.add('loading')
  } else {
    if (document.body.classList.contains('loading')) document.body.classList.remove('loading')
  }
}

init()
