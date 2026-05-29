import ee
ee.Authenticate()
ee.Initialize(project='Yes_Your_Project')
print(ee.String('Hello from the Earth Engine servers!').getInfo())