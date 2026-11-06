<script>
  import {_} from '../locales';
  import Section from './Section.svelte';
  import Button from './Button.svelte';
  import ImageInput from './ImageInput.svelte';
  import Packager from '../packager/web/export';
  import loadProject from '../packager/load-project';
  import downloadURL from './download-url';
  import {addLog} from './log';

  export let files = [];

  const ORIENTATIONS = ['sensorLandscape', 'landscape', 'portrait', 'fullSensor'];
  const MIN_SDKS = [21, 23, 24, 26];

  const defaultSettings = () => ({
    turbo: false,
    framerate: 30,
    interpolation: false,
    highQualityPen: false,
    infiniteClones: false,
    fencing: true,
    miscLimits: true,
    username: 'player####',
    closeWhenStopped: false,
    stageWidth: 480,
    stageHeight: 360,
    resizeMode: 'preserve-ratio',
    windowTitle: '',
    loadingProgress: true,
    loadingText: '',
    autoplay: false,
    greenFlag: false,
    stopAll: false,
    pause: false,
    fullscreen: false
  });

  let entries = files.map((file, index) => {
    const title = file.name.replace(/\.(sb3|sb2|sb)$/i, '');
    const settings = defaultSettings();
    settings.windowTitle = title;
    return {
      id: index,
      file,
      title,
      target: 'html',
      fileName: '',
      statusKey: 'batchStatusIdle',
      statusDetail: '',
      resultName: '',
      resultUrl: '',
      resultSize: 0,
      icon: null,
      loadingImage: null,
      apkIcon: null,
      settings,
      apk: {
        packageName: 'com.zx.scapp',
        appName: 'zx的sc作品',
        versionName: '2.5',
        versionCode: 2,
        orientation: 'sensorLandscape',
        minSdk: 21
      }
    };
  });

  let compressionLevel = 6;
  let protectEnabled = true;
  let watermark = '';
  let autoOpen = true;
  let concurrency = 3;
  let running = false;
  let nextIndex = 0;

  const downloadQueue = [];
  let downloading = false;
  const pumpDownloads = () => {
    if (downloading || !downloadQueue.length) {
      return;
    }
    downloading = true;
    const item = downloadQueue.shift();
    downloadURL(item.name, item.url);
    setTimeout(() => {
      downloading = false;
      pumpDownloads();
    }, 1200);
  };
  const enqueueDownload = (name, url) => {
    downloadQueue.push({
      name,
      url
    });
    pumpDownloads();
  };

  const setStatus = (entry, key, detail) => {
    entry.statusKey = key;
    entry.statusDetail = detail || '';
    entries = entries;
  };

  const openOutput = () => {
    if (autoOpen && window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({
        action: 'openOutput'
      });
    }
  };

  const exportName = (entry, result) => {
    const dot = result.filename.lastIndexOf('.');
    const extension = dot >= 0 ? result.filename.substring(dot) : '';
    const date = new Date().toISOString().substring(0, 10);
    const template = entry.fileName.trim() || '{title}';
    const base = template
      .replace(/\{title\}/g, entry.settings.windowTitle || entry.title)
      .replace(/\{target\}/g, entry.target)
      .replace(/\{version\}/g, entry.target === 'apk' ? entry.apk.versionName : '2.5')
      .replace(/\{date\}/g, date);
    if (extension && base.toLowerCase().endsWith(extension.toLowerCase())) {
      return base;
    }
    return base + extension;
  };

  const buildOptions = (entry) => {
    const s = entry.settings;
    const options = Packager.DEFAULT_OPTIONS();
    options.app.windowTitle = s.windowTitle || entry.title;
    options.app.packageName = Packager.getDefaultPackageNameFromFileName(entry.file.name);
    options.app.version = '2.5';
    options.app.icon = entry.icon;
    options.target = entry.target;
    options.compression.level = compressionLevel;
    options.protect.enabled = protectEnabled;
    options.protect.watermark = watermark;
    options.turbo = s.turbo;
    options.framerate = Math.max(1, Number(s.framerate) || 30);
    options.interpolation = s.interpolation;
    options.highQualityPen = s.highQualityPen;
    options.maxClones = s.infiniteClones ? Infinity : 300;
    options.fencing = s.fencing;
    options.miscLimits = s.miscLimits;
    options.username = s.username;
    options.closeWhenStopped = s.closeWhenStopped;
    options.stageWidth = Math.max(1, Number(s.stageWidth) || 480);
    options.stageHeight = Math.max(1, Number(s.stageHeight) || 360);
    options.resizeMode = s.resizeMode;
    options.loadingScreen.progressBar = s.loadingProgress;
    options.loadingScreen.text = s.loadingText;
    options.loadingScreen.image = entry.loadingImage;
    options.autoplay = s.autoplay;
    options.controls.greenFlag.enabled = s.greenFlag;
    options.controls.stopAll.enabled = s.stopAll;
    options.controls.pause.enabled = s.pause;
    options.controls.fullscreen.enabled = s.fullscreen;
    if (entry.target === 'apk') {
      options.apk.packageName = entry.apk.packageName;
      options.apk.appName = entry.apk.appName;
      options.apk.versionName = entry.apk.versionName;
      options.apk.versionCode = entry.apk.versionCode;
      options.apk.orientation = entry.apk.orientation;
      options.apk.minSdk = entry.apk.minSdk;
      options.apk.icon = entry.apkIcon;
    }
    if (entry.target === 'exe') {
      options.exe.icon = entry.icon;
      options.exe.name = s.windowTitle || entry.title;
      options.exe.version = '2.5';
    }
    return options;
  };

  const packEntry = async (entry) => {
    try {
      if (entry.resultUrl) {
        URL.revokeObjectURL(entry.resultUrl);
        entry.resultUrl = '';
      }
      setStatus(entry, 'batchStatusLoading');
      const loaded = await (await loadProject.fromFile(entry.file, (type, a, b) => {
        if (type === 'assets' && b) {
          setStatus(entry, 'batchStatusLoading', `${a}/${b}`);
        }
      })).promise;
      setStatus(entry, 'batchStatusPacking');
      const packager = new Packager();
      packager.options = buildOptions(entry);
      packager.project = loaded;
      const started = performance.now();
      const result = await packager.package();
      const blob = new Blob([result.data], {
        type: result.type
      });
      const url = URL.createObjectURL(blob);
      const filename = exportName(entry, result);
      entry.resultUrl = url;
      entry.resultName = filename;
      entry.resultSize = blob.size;
      entries = entries;
      enqueueDownload(filename, url);
      const elapsed = ((performance.now() - started) / 1000).toFixed(2);
      setStatus(entry, 'batchStatusDone', `${elapsed}s ${(blob.size / 1000 / 1000).toFixed(2)}MB`);
      addLog($_('zx.logBatchDone').replace('{file}', filename).replace('{time}', elapsed).replace('{size}', (blob.size / 1000 / 1000).toFixed(2)));
    } catch (e) {
      setStatus(entry, 'batchStatusFail', e && e.message ? e.message : String(e));
      addLog($_('zx.logBatchFail').replace('{file}', entry.file.name).replace('{error}', e && e.message ? e.message : e));
    }
  };

  const worker = async () => {
    while (nextIndex < entries.length) {
      const index = nextIndex++;
      await packEntry(entries[index]);
    }
  };

  const start = async () => {
    if (running || !files.length) {
      return;
    }
    running = true;
    nextIndex = 0;
    for (const entry of entries) {
      setStatus(entry, 'batchStatusIdle');
    }
    const count = Math.min(Math.max(1, Number(concurrency) || 1), 20, entries.length);
    const workers = [];
    for (let i = 0; i < count; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    running = false;
    openOutput();
  };

  const retry = async (entry) => {
    if (running) {
      return;
    }
    running = true;
    await packEntry(entry);
    running = false;
    openOutput();
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= entries.length) {
      return;
    }
    const item = entries.splice(index, 1)[0];
    entries.splice(target, 0, item);
    entries = entries;
  };

  const remove = (index) => {
    entries.splice(index, 1);
    entries = entries;
  };

  $: doneTotal = entries.filter((entry) => entry.statusKey === 'batchStatusDone').length;
  $: failTotal = entries.filter((entry) => entry.statusKey === 'batchStatusFail').length;
</script>

<style>
  .row {
    border: 1px solid rgba(128, 128, 128, 0.25);
    border-radius: 6px;
    padding: 10px;
    margin: 10px 0;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .row-name {
    font-weight: bold;
    flex-grow: 1;
    word-break: break-all;
  }
  .status {
    font-size: 0.85em;
    opacity: 0.85;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
    margin-top: 8px;
  }
  .grid label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .grid input[type="text"] {
    width: 100%;
    min-width: 0;
  }
  .grid input[type="number"] {
    width: 80px;
  }
  .controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    margin: 8px 0;
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .link {
    margin-top: 6px;
    font-size: 0.9em;
  }
  details {
    margin-top: 8px;
  }
</style>

<Section accent="#14a0ff">
  <h2>{$_('zx.batchProjects')}</h2>
  <div class="controls">
    <label>
      {$_('zx.batchConcurrency')}
      <input type="number" min="1" max="20" bind:value={concurrency}>
    </label>
    <label>
      {$_('zx.batchCompression')}
      <select bind:value={compressionLevel}>
        <option value={1}>{$_('zx.presetFast')}</option>
        <option value={6}>{$_('zx.presetNormal')}</option>
        <option value={9}>{$_('zx.presetMax')}</option>
      </select>
    </label>
    <label>
      <input type="checkbox" bind:checked={protectEnabled} />
      {$_('zx.protectEnable')}
    </label>
    <label>
      {$_('zx.protectWatermark')}
      <input type="text" bind:value={watermark} placeholder={$_('zx.protectWatermarkPlaceholder')}>
    </label>
    <label>
      <input type="checkbox" bind:checked={autoOpen} />
      {$_('zx.autoOpen')}
    </label>
  </div>

  {#each entries as entry, index (entry.id)}
    <div class="row">
      <div class="row-head">
        <span class="row-name">{entry.file.name}</span>
        <select bind:value={entry.target}>
          <option value="html">{$_('options.html')}</option>
          <option value="zip">{$_('options.zip')}</option>
          <option value="exe">{$_('zx.targetExe')}</option>
          <option value="apk">{$_('zx.targetApk')}</option>
        </select>
        <span class="status">{$_(`zx.${entry.statusKey}`)} {entry.statusDetail}</span>
      </div>

      <div class="grid">
        <label>
          {$_('zx.fileName')}
          <input type="text" bind:value={entry.fileName} placeholder={"{title}-{target}"}>
        </label>
        <label>
          {$_('zx.pageTitle')}
          <input type="text" bind:value={entry.settings.windowTitle}>
        </label>
      </div>

      {#if entry.target === 'apk'}
        <div class="grid">
          <label>
            {$_('zx.apkPackage')}
            <input type="text" bind:value={entry.apk.packageName}>
          </label>
          <label>
            {$_('zx.apkAppName')}
            <input type="text" bind:value={entry.apk.appName}>
          </label>
          <label>
            {$_('zx.apkVersionName')}
            <input type="text" bind:value={entry.apk.versionName}>
          </label>
          <label>
            {$_('zx.apkVersionCode')}
            <input type="number" min="1" bind:value={entry.apk.versionCode}>
          </label>
          <label>
            {$_('zx.apkOrientation')}
            <select bind:value={entry.apk.orientation}>
              {#each ORIENTATIONS as orientation}
                <option value={orientation}>{$_(`zx.orientation_${orientation}`)}</option>
              {/each}
            </select>
          </label>
          <label>
            {$_('zx.apkMinSdk')}
            <select bind:value={entry.apk.minSdk}>
              {#each MIN_SDKS as sdk}
                <option value={sdk}>API {sdk}</option>
              {/each}
            </select>
          </label>
        </div>
        <div style="margin-top: 8px">
          <ImageInput bind:file={entry.apkIcon} previewSizes={[[48, 48]]} />
        </div>
      {/if}

      <details>
        <summary>{$_('zx.batchAdvanced')}</summary>
        <div class="grid">
          <label>
            {$_('options.turbo')}
            <input type="checkbox" bind:checked={entry.settings.turbo}>
          </label>
          <label>
            {$_('options.framerate')}
            <input type="number" min="1" max="120" bind:value={entry.settings.framerate}>
          </label>
          <label>
            {$_('options.interpolation')}
            <input type="checkbox" bind:checked={entry.settings.interpolation}>
          </label>
          <label>
            {$_('zx.highQualityPen')}
            <input type="checkbox" bind:checked={entry.settings.highQualityPen}>
          </label>
          <label>
            {$_('zx.infiniteClones')}
            <input type="checkbox" bind:checked={entry.settings.infiniteClones}>
          </label>
          <label>
            {$_('zx.fencing')}
            <input type="checkbox" bind:checked={entry.settings.fencing}>
          </label>
          <label>
            {$_('zx.miscLimits')}
            <input type="checkbox" bind:checked={entry.settings.miscLimits}>
          </label>
          <label>
            {$_('options.username')}
            <input type="text" bind:value={entry.settings.username}>
          </label>
          <label>
            {$_('options.closeWhenStopped')}
            <input type="checkbox" bind:checked={entry.settings.closeWhenStopped}>
          </label>
          <label>
            {$_('zx.stageWidth')}
            <input type="number" min="1" bind:value={entry.settings.stageWidth}>
          </label>
          <label>
            {$_('zx.stageHeight')}
            <input type="number" min="1" bind:value={entry.settings.stageHeight}>
          </label>
          <label>
            {$_('zx.resizeMode')}
            <select bind:value={entry.settings.resizeMode}>
              <option value="preserve-ratio">{$_('zx.resizePreserve')}</option>
              <option value="stretch">{$_('zx.resizeStretch')}</option>
              <option value="dynamic">{$_('zx.resizeDynamic')}</option>
            </select>
          </label>
          <label>
            {$_('zx.loadingProgress')}
            <input type="checkbox" bind:checked={entry.settings.loadingProgress}>
          </label>
          <label>
            {$_('options.loadingScreenText')}
            <input type="text" bind:value={entry.settings.loadingText}>
          </label>
          <label>
            {$_('options.autoplay')}
            <input type="checkbox" bind:checked={entry.settings.autoplay}>
          </label>
          <label>
            {$_('zx.greenFlag')}
            <input type="checkbox" bind:checked={entry.settings.greenFlag}>
          </label>
          <label>
            {$_('zx.stopAll')}
            <input type="checkbox" bind:checked={entry.settings.stopAll}>
          </label>
          <label>
            {$_('zx.pause')}
            <input type="checkbox" bind:checked={entry.settings.pause}>
          </label>
          <label>
            {$_('zx.fullscreen')}
            <input type="checkbox" bind:checked={entry.settings.fullscreen}>
          </label>
        </div>
        <div style="margin-top: 8px">
          <div>{$_('options.icon')}</div>
          <ImageInput bind:file={entry.icon} previewSizes={[[32, 32], [64, 64]]} />
        </div>
        <div style="margin-top: 8px">
          <div>{$_('options.loadingScreenImage')}</div>
          <ImageInput bind:file={entry.loadingImage} previewSizes={[[96, 72]]} />
        </div>
      </details>

      <div class="actions">
        <Button on:click={() => move(index, -1)} secondary text={$_('zx.moveUp')} />
        <Button on:click={() => move(index, 1)} secondary text={$_('zx.moveDown')} />
        <Button on:click={() => retry(entry)} secondary text={$_('zx.retry')} />
        <Button on:click={() => remove(index)} dangerous text={$_('zx.remove')} />
      </div>

      {#if entry.resultUrl}
        <div class="link">
          <a href={entry.resultUrl} download={entry.resultName}>{entry.resultName}</a>
          <span> {(entry.resultSize / 1000 / 1000).toFixed(2)}MB</span>
        </div>
      {/if}
    </div>
  {/each}

  <div class="controls">
    <span>{$_('zx.batchSummary')}: {doneTotal} / {entries.length} {$_('zx.batchFailures')} {failTotal}</span>
    <Button on:click={start} text={running ? $_('zx.batchRunning') : $_('zx.batchStartAll')} />
  </div>
</Section>
