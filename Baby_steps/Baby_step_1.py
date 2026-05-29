# Source https://github.com/google/earthengine-community/blob/master/tutorials/intro-to-python-api/index.ipynb

import ee
ee.Authenticate()
ee.Initialize(project='Nein_Your_Project')
print(ee.String('Hello from the Earth Engine servers!').getInfo())

# NOTE: Shit gets saved to Google drive
## No idea what this is supposed to do?

# Import the MODIS land cover collection.
lc = ee.ImageCollection('MODIS/061/MCD12Q1')

# Import the MODIS land surface temperature collection.
lst = ee.ImageCollection('MODIS/061/MOD11A1')

# Import the USGS ground elevation image.
elv = ee.Image('USGS/SRTMGL1_003')