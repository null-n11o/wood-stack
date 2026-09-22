import {loadCatalog} from './repository';
import {toPublicCatalog} from './public';
import {jstToday} from '../offers/freshness';
export async function siteCatalog(){return toPublicCatalog(await loadCatalog('src/data/catalog.json',jstToday()),jstToday());}
