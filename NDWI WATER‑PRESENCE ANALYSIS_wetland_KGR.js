/******************** NDWI WATER‑PRESENCE ANALYSIS ************************/
// Define MultiPoint object with specific identifiers
var points = [
  {id: "P1", coords: [32.241497, -24.243967]},
  {id: "P2", coords: [32.198528, -24.232408]},
  {id: "P3", coords: [32.308944, -24.304761]},
  {id: "P5", coords: [32.277047, -24.282758]},
  {id: "P4", coords: [32.275736, -24.284472]},
  {id: "P6", coords: [32.13496667, -24.154875]},
  {id: "P7", coords: [32.12653889, -24.15561111]},
  {id: "P8", coords: [32.22418333, -24.24173333]},
  {id: "P9", coords: [32.02958889, -24.09045]},
  {id: "P10", coords: [32.02861111, -24.08984722]},
  {id: "P11", coords: [32.04903889, -24.05135556]},
  {id: "P12", coords: [31.97714722, -24.13476111]},
  {id: "P13", coords: [32.07562778, -24.06360833]},
  {id: "P14", coords: [32.038608, -24.037403]},
  {id: "P15", coords: [32.055114, -24.051461]},
  {id: "P16", coords: [32.03261389, -24.31846667]},
  {id: "P46", coords: [32.238783, -24.244033]}
];
// Define AOI for Sentinel-2 processing
var aoi = ee.Geometry.Rectangle([32.04903889, -24.05135556, 32.26139722, -24.33536667]);

// 0)  ── PARAMETERS ───────────────────────────────────────────────────────
var ndwiStart = '2023-07-01';
var ndwiEnd   = '2023-07-25';        // change as required
var ndwiThresh = 0.30;               // quick‑and‑dirty threshold
var useRF = true;                    // set false to rely on the threshold only
var nTrees = 100;                    // random‑forest tree count
// -----------------------------------------------------------------------

// 1)  ── LOAD & PREPARE SENTINEL‑2 (only 10 m bands) ─────────────────────
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate(ndwiStart, ndwiEnd)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
  .select(['B3','B8'])                          // Green (B3) & NIR (B8)
  .map(function(img){
      return img.divide(10000)                  // scale to reflectance
                .copyProperties(img,['system:time_start']);
  });

// 2)  ── BUILD 8‑DAY MEDIAN NDWI COMPOSITE ───────────────────────────────
var ndwiComposite = s2
  .median()                                     // simple median for period
  .normalizedDifference(['B3','B8'])            // (G‑NIR)/(G+NIR)
  .rename('NDWI')
  .clip(aoi);

// 3)  ── SIMPLE THRESHOLD MASK (optional fall‑back) ─────────────────────
var ndwiMaskSimple = ndwiComposite.gt(ndwiThresh).selfMask();
Map.addLayer(ndwiMaskSimple,
             {palette:['cyan']},
             'NDWI mask (thr='+ndwiThresh+')', false);

// 4)  ── SUPERVISED WATER MASK WITH RANDOM‑FOREST ‑‑ optional ────────────
var waterRFMask = ndwiMaskSimple;  // default fallback
if (useRF) {

  // 4.1 Attach class labels to your polygons.  Example:
  //      1 = water, 0 = non‑water (change as you need)
  var labeledPolys = ee.FeatureCollection([
    ee.Feature(P1 , {'class':0}),
    ee.Feature(P2 , {'class':0}),
    ee.Feature(P3 , {'class':0}),
    ee.Feature(P4 , {'class':0}),
    ee.Feature(P5 , {'class':0}),
    ee.Feature(P6 , {'class':1}),  // ← mark water polygons as 1
    ee.Feature(P7 , {'class':1}),
    ee.Feature(P8 , {'class':1}),
    ee.Feature(P9 , {'class':1}),
    // … add the rest
  ]);

  // 4.2 Sample NDWI + original bands for training
  var stack = ndwiComposite.addBands(s2.median());      // NDWI, B3, B8
  var train = stack.sampleRegions({
      collection: labeledPolys,
      properties:['class'],
      scale:10,
      tileScale:4
  });

  // 4.3 Train the Random‑Forest
  var rf = ee.Classifier.smileRandomForest({
              numberOfTrees: nTrees , 
              minLeafPopulation: 1 ,
              bagFraction: 0.7 }).train(train, 'class');

  // 4.4 Classify & mask
  var rfClass = stack.classify(rf);
  waterRFMask = rfClass.eq(1).selfMask();
  Map.addLayer(waterRFMask, {palette:['blue']},
               'Water mask (Random Forest)', true);

  // 4.5 Print confusion matrix
  var cm = rf.confusionMatrix();
  print('RF confusion matrix', cm);
  print('RF overall accuracy', cm.accuracy());
}

// 5)  ── PER‑POLYGON WATER STATISTICS ────────────────────────────────────
var waterStats = drawnFeatures.map(function(f){
  var waterArea = waterRFMask.multiply(ee.Image.pixelArea())
                              .reduceRegion({
                                reducer: ee.Reducer.sum(),
                                geometry: f.geometry(),
                                scale: 10,
                                maxPixels: 1e9
                              }).get('NDWI'); // or 0 if threshold mask

  var polyArea  = f.geometry().area();
  return f.set({
    'Water_m2' : waterArea,
    'Water_%'  : ee.Number(waterArea).divide(polyArea).multiply(100)
  });
});

print('Per‑polygon water stats', waterStats);

Export.table.toDrive({
  collection: waterStats,
  description: 'WaterFractionByPolygon_'+ndwiStart+'_'+ndwiEnd,
  fileFormat: 'CSV'
});
