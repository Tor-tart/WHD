## The Goal
Make hydroperiod using overlay of (preferably blue) for specific dates across 10 years (2015 to 2025).

## Setup Guide

1. Python env setup
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirments.txt
```

2. Authenticate

```bash
python3 NDWI.py --setup
```

3. Register a project
- Setup cloud project for non-commercial project:
- https://developers.google.com/earth-engine/guides/access#get-access-to-earth-engine
- Enable Earth Engine API plugin.

4. Attach project to NDWI
```bash
python3 NDWI.py -p {Project ID}
```

NOTE: Stuff gets saved into your Google drive

---

#### TODO
- Create overlay
- extract specific dates (August-April/ year) images with overlay
- 2015 to 2025
- exclude photos/ overlays > 40% cloud cover
- Loop images preferred

#### Problems
- all dates combine into 'Franken'-image (even with date range)
- images won't download/ show up as layers
- water percentage change won't calculate
- resolution changes
- silencing lines
