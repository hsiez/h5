import assert from 'node:assert/strict';
import { regionHref, itemHref, previewSelection } from '../../app/loadout/catalog-navigation.ts';
const catalog = {
 regions: [{id:'edc'}, {id:'things-for-you'}],
 items: [{slug:'published',regionId:'edc'}, {slug:'draft jacket',regionId:'things-for-you',published:false,title:'Draft title'}],
};
assert.equal(regionHref(null,true),'/admin/preview');
assert.equal(regionHref('things-for-you',true),'/admin/preview?region=things-for-you');
assert.equal(itemHref('draft jacket','things-for-you',true),'/admin/preview?region=things-for-you&item=draft%20jacket');
assert.deepEqual(previewSelection(catalog,{region:'things-for-you',item:'draft jacket'}),{regionId:'things-for-you',itemIndex:0});
assert.deepEqual(previewSelection(catalog,{}),{regionId:null,itemIndex:-1});
assert.deepEqual(previewSelection(catalog,{region:'edc',item:'draft jacket'}),{regionId:'edc',itemIndex:-1});
assert.equal(itemHref('published','edc'),'/things/item/published');
assert.equal(regionHref('edc'),'/things?region=edc');
console.log('Private preview navigation retains draft selection; public routes unchanged.');
