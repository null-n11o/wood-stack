import {getCollection} from 'astro:content';
import {siteCatalog} from '../catalog/site';
import {validateArticles} from './related';
import {jstToday} from '../offers/freshness';
export async function publishedArticles(){const all=await getCollection('articles');validateArticles(all.map(a=>a.data),await siteCatalog(),jstToday());return all.filter(a=>a.data.status==='published');}
