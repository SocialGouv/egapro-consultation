async function request(method, url, body, options = {}) {
  if(!['get', 'head'].includes(method.toLowerCase()))
  options.body = body ? JSON.stringify(body) : ""
  options.method = method
  options.headers = {}
  const response = await fetch(url, options)
  try {
    response.data = await response.json()
  }
  catch (e) {
    response.data = null
  }
  return response
}
