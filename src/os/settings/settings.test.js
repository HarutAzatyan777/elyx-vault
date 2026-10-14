import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OS_SETTINGS, normalizeSettings, loadOSSettings, saveOSSettings } from './settingsConfig.js';
import { enqueueNotification, markNotificationsRead } from '../notifications/notificationState.js';
import { getAgentStatus, reportAgentConnection } from '../agentStatus.js';
test('settings survive storage round trip without persisting unknown secrets', () => {
  const values = new Map();
  globalThis.localStorage = {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  saveOSSettings({...DEFAULT_OS_SETTINGS,theme:'system',mobileMode:'android',desktopMode:'gnome',accentColor:'#ff1234',reducedMotion:true,password:'secret'});
  const settings = loadOSSettings();
  assert.equal(settings.theme,'system'); assert.equal(settings.mobileMode,'android'); assert.equal(settings.desktopMode,'gnome'); assert.equal(settings.reducedMotion,true); assert.equal(settings.accentColor,'#ff1234'); assert.equal(settings.password,undefined);
  values.set('elyx_os_settings','broken JSON'); assert.deepEqual(loadOSSettings(),DEFAULT_OS_SETTINGS);
  delete globalThis.localStorage;
});
test('corrupt settings cannot inject CSS or unsupported modes',()=>{
  const s = normalizeSettings({theme:'invalid',accentColor:'red; background:url(x)',autoLockMinutes:NaN,disabledNotificationCategories:'security'});
  assert.deepEqual(s,DEFAULT_OS_SETTINGS);
  assert.deepEqual(normalizeSettings(null),DEFAULT_OS_SETTINGS);
});
test('notifications respect category preferences and retain unread items',()=>{
  const disabled = {...DEFAULT_OS_SETTINGS,disabledNotificationCategories:['media']};
  assert.deepEqual(enqueueNotification([],{category:'media'},disabled),[]);
  assert.deepEqual(enqueueNotification([],{title:'Private'}, {...DEFAULT_OS_SETTINGS,notificationsEnabled:false}),[]);
  let items = enqueueNotification([],{id:'one',type:'security',title:'Locked'},DEFAULT_OS_SETTINGS,1);
  items = enqueueNotification(items,{id:'two',category:'devices'},DEFAULT_OS_SETTINGS,2);
  assert.equal(items[1].category,'security'); assert.equal(items.filter(n=>!n.read).length,2);
  items = markNotificationsRead(items,'one'); assert.equal(items.filter(n=>!n.read).length,1);
  assert.equal(markNotificationsRead(items).filter(n=>!n.read).length,0);
  assert.equal(enqueueNotification(items,{id:'two'},DEFAULT_OS_SETTINGS).length,2);
});
test('agent status handles multiple actual terminal connections',()=>{
  reportAgentConnection('a',true);reportAgentConnection('b',true);
  reportAgentConnection('a',false);assert.equal(getAgentStatus(),'Connected terminal');
  reportAgentConnection('b',false);assert.equal(getAgentStatus(),'No active terminal connection');
});
