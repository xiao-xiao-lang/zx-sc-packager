# zx Scratch Packager

Scratch 作品打包器 · HTML / ZIP / 单文件 EXE / 安卓 APK

[中文](#中文) | [English](#english) | [Français](#français) | [Deutsch](#deutsch) | [Русский](#русский)

> 语言说明 中文为准确版本 英文 法文 德文 俄文为机器翻译 如有歧义以中文为准
>
> Language note Chinese is the authoritative version English French German Russian are machine translations

## 中文

### 这是什么

一个给 Scratch 创作者用的 Windows 打包工具

拖入一个 sb3 或一次拖入一堆

选择目标 直接得到可以分享或安装的文件

全部计算都在你自己的电脑上完成

### 为什么好用

- **原生离线** 没有服务器 没有上传 没有登录
- **一个工具四种产物** HTML、ZIP、单文件 EXE、安卓 APK
- **真正的批量模式** 一次多选 最多 20 个任务同时打包 每个作品独立设置
- **小体积 EXE** 额外体积约 0.9MB 支持自定义图标 自定义应用名称 自定义应用版本
- **不用安卓开发环境** 图标 包名 应用名 版本名 版本号 屏幕方向 最低安卓版本全部可改
- **轻量防解包** 工程数据落盘加密 运行前在内存解密 作品运行完全不受影响
- **老系统也能用** 单独提供 Win7 SP1 的 32 位与 64 位版本
- **三档压缩预设** 极速 标准 极限压缩 一键切换
- **可读日志** 每次打包记录耗时 体积 输出位置

### 四种产物

| 产物 | 输出 | 适合场景 |
| --- | --- | --- |
| HTML | 单个自包含 html | 网页分享 快速测试 |
| ZIP | html 加素材的压缩包 | 上传到网站 后期继续编辑 |
| 单文件 EXE | 一个 exe | 发给 Windows 玩家 |
| 安卓 APK | 一个已签名 apk | 安装到手机和平板 |

### 批量模式

在选择作品时一次选中多个 sb3

队列会为每个作品生成一张卡片

每张卡片都能单独选择产物 输出文件名和完整运行设置

可设置页面标题 舞台宽高 缩放模式 加速模式 帧率 补帧 高清画笔 无限克隆 边缘穿越 其他限制 用户名 停止关闭

可设置加载进度 加载文本 加载图片 窗口图标 自动开始 以及绿旗 停止 暂停 全屏按钮

支持上移 下移 删除 单项重试 然后一键全部开始

下载会自动排队 避免浏览器把连续下载拦掉

### APK 选项

- 图标支持常见图片格式
- 包名 应用名 版本名 版本号
- 屏幕方向 最低安卓版本
- 本地完成 v1 与 v2 签名
- 包名可改 多个作品可以同时安装

### 支持这个项目

如果它帮你省了时间

- 给仓库点一个 Star
- 在我的 GitHub 主页点 Follow
- 转给身边做 Scratch 的朋友

没有广告 没有捐赠弹窗 没有数据统计

### 从源码构建

建议 Node 18 或更高

```bash
npm ci
npx cross-env NODE_ENV=production STANDALONE=1 VERSION=v2.5 webpack
node src/build/generate-standalone.js
```

启动器源码在 `launcher` 单文件作品启动器源码在 `player`

两个都是纯 C# WinForms 用 csc 加 WebView2 编译

### 协议与来源

基于 TurboWarp Packager 3.14.0 改编

遵循 MPL-2.0 与原项目一致

保留原始 LICENSE 文件与所有版权声明

修改过的源码随每个版本一并公开 满足 MPL-2.0 的源码开放要求

不添加额外限制 不影响原项目的授权

Scratch 名称与标志归 MIT Media Lab 所有

TurboWarp 名称归其作者所有

本项目与 TurboWarp、Scratch、MIT 无隶属关系 也未获其背书

## English

### What it is

A Windows packager built for Scratch creators

Drop in one sb3 file or a whole folder of them

Pick a target and get a build you can share or install

All work happens on your own machine

### Why it is useful

- **Offline by design** — no server, no upload, no login
- **Four targets in one tool** — HTML, ZIP, single EXE, Android APK
- **Real batch mode** — select many projects, run up to 20 at once, each with its own settings
- **Small EXE output** — about 0.9MB overhead, custom icon, custom app name, custom version
- **APK without Android Studio** — custom icon, package name, app name, version, screen orientation, minimum Android version
- **Light anti-unpack layer** — project data is encrypted on disk and decrypted in memory before loading, runtime behavior stays the same
- **Old system support** — a separate Win7 SP1 build for both 32-bit and 64-bit systems
- **Fast presets** — speed, standard, max compression, switch with one click
- **Readable logs** — every build shows time, size and output path

### Targets

| Target | Output | Best for |
| --- | --- | --- |
| HTML | one self-contained html file | sharing on the web, quick tests |
| ZIP | html plus assets in a zip | hosting on a site, editing later |
| Single EXE | one exe file | sending to players on Windows |
| Android APK | one signed apk | installing on phones and tablets |

### Batch mode

Select multiple sb3 files in the picker

The queue opens with one card per project

Each card has its own target, output name and full runtime settings

Set page title, stage size, resize mode, turbo mode, framerate, interpolation, high quality pen, infinite clones, fencing, misc limits, username, close on stop

Set loading progress, loading text, loading image, window icon, autoplay and the green flag, stop, pause and fullscreen buttons

Reorder, remove, retry a single build, then start them all

Downloads are spaced out so the browser does not block them

### APK options

- Icon from any common image format
- Package name, app name, version name, version code
- Screen orientation and minimum Android version
- v1 and v2 signatures applied locally
- Package name is customizable so several projects can live side by side

### Support this project

If this tool saves you time

- Star this repository
- Hit Follow on my GitHub profile
- Send it to a friend who makes Scratch games

No ads, no donation popups, no telemetry

### Build from source

Node 18 or newer is recommended

```bash
npm ci
npx cross-env NODE_ENV=production STANDALONE=1 VERSION=v2.5 webpack
node src/build/generate-standalone.js
```

The launcher source lives in `launcher` and the single EXE player source lives in `player`

Both are plain C# WinForms projects compiled with csc and WebView2

### License and credit

Based on TurboWarp Packager 3.14.0

Released under MPL-2.0, the same license as upstream

Original LICENSE file and all copyright notices are kept

Modified source is published with every release as MPL-2.0 requires

No extra restrictions are added and the upstream license is not affected

Scratch name and logo belong to MIT Media Lab

TurboWarp name belongs to its authors

Not affiliated with TurboWarp, Scratch or MIT and not endorsed by them

## Français

### Le projet

Un outil Windows pensé pour les créateurs Scratch

Déposez un fichier sb3 ou toute une série

Choisissez une cible et récupérez un fichier prêt à partager ou à installer

Tout le traitement reste sur votre machine

### Points forts

- **Hors ligne** — aucun serveur, aucun envoi, aucune connexion
- **Quatre sorties** — HTML, ZIP, EXE unique, APK Android
- **Vrai mode lot** — sélection multiple, jusqu'à 20 tâches en parallèle, réglages par projet
- **EXE compact** — environ 0,9MB de surcoût, icône, nom et version personnalisables
- **APK sans Android Studio** — icône, nom de paquet, nom de l'application, version, orientation et version Android minimale
- **Protection légère** — données chiffrées sur disque, déchiffrées en mémoire au lancement, le jeu tourne normalement
- **Anciens systèmes** — version séparée pour Win7 SP1 en 32 et 64 bits
- **Préréglages rapides** — rapide, standard, compression maximale
- **Journal lisible** — durée, taille et destination pour chaque build

### Cibles

| Cible | Sortie | Usage |
| --- | --- | --- |
| HTML | un fichier html autonome | partage web, test rapide |
| ZIP | html et ressources dans un zip | hébergement, retouche |
| EXE unique | un seul exe | envoi aux joueurs Windows |
| APK Android | un apk signé | installation sur téléphone et tablette |

### Mode lot

Sélectionnez plusieurs sb3 dans l'explorateur

Une fiche par projet apparaît dans la file

Chaque fiche a sa cible, son nom de sortie et ses réglages

Titre de page, taille de scène, mode de redimensionnement, mode turbo, images par seconde, interpolation, stylo haute qualité, clones illimités, franchissement des bords, limites diverses, nom d'utilisateur, fermeture à l'arrêt

Écran de chargement, texte, image, icône de fenêtre, démarrage auto et boutons drapeau vert, stop, pause, plein écran

Monter, descendre, supprimer, relancer une fiche puis tout lancer

Les téléchargements sont espacés pour éviter le blocage du navigateur

### Options APK

- Icône depuis les formats d'image courants
- Nom de paquet, nom de l'application, nom et code de version
- Orientation et version Android minimale
- Signatures v1 et v2 générées localement
- Nom de paquet modifiable pour installer plusieurs projets côte à côte

### Soutenir le projet

Si cet outil vous fait gagner du temps

- Ajoutez une Star au dépôt
- Cliquez sur Follow sur mon profil GitHub
- Partagez-le avec un ami qui crée sur Scratch

Pas de publicité, pas de fenêtre de don, pas de statistiques

### Compiler

Node 18 ou plus récent recommandé

```bash
npm ci
npx cross-env NODE_ENV=production STANDALONE=1 VERSION=v2.5 webpack
node src/build/generate-standalone.js
```

Le lanceur se trouve dans `launcher`, le lecteur EXE dans `player`

Deux projets C# WinForms compilés avec csc et WebView2

### Licence et origine

Adapté de TurboWarp Packager 3.14.0

Distribué sous MPL-2.0, la licence du projet d'origine

Le fichier LICENSE et tous les avis de copyright sont conservés

Le code modifié est publié à chaque version comme l'exige MPL-2.0

Aucune restriction supplémentaire n'est ajoutée et la licence d'origine reste intacte

Le nom et le logo Scratch appartiennent à MIT Media Lab

Le nom TurboWarp appartient à ses auteurs

Aucun lien officiel avec TurboWarp, Scratch ou MIT et aucune approbation de leur part

## Deutsch

### Das Projekt

Ein Windows-Packager für Scratch-Entwickler

Eine sb3 Datei oder gleich mehrere hineinziehen

Ziel wählen und eine fertige Datei zum Teilen oder Installieren erhalten

Die gesamte Verarbeitung bleibt auf deinem Rechner

### Warum praktisch

- **Wirklich offline** — kein Server, kein Upload, keine Anmeldung
- **Vier Ziele** — HTML, ZIP, einzelne EXE, Android-APK
- **Echter Stapelmodus** — Mehrfachauswahl, bis zu 20 Aufgaben parallel, Einstellungen pro Projekt
- **Kleine EXE** — rund 0,9MB Aufschlag, eigenes Symbol, eigener Name, eigene Version
- **APK ohne Android Studio** — Symbol, Paketname, App-Name, Version, Ausrichtung und minimale Android-Version
- **Leichter Schutz** — Projektdaten verschlüsselt auf der Platte, im Speicher vor dem Start entschlüsselt, das Spiel läuft unverändert
- **Alte Systeme** — separate Version für Win7 SP1 in 32 und 64 Bit
- **Schnelle Profile** — schnell, standard, maximale Kompression
- **Lesbares Protokoll** — Dauer, Größe und Zielordner für jeden Build

### Ziele

| Ziel | Ausgabe | Geeignet für |
| --- | --- | --- |
| HTML | eine eigenständige html Datei | Web, schneller Test |
| ZIP | html und Ressourcen als zip | Hosten, später bearbeiten |
| Einzelne EXE | eine exe Datei | Weitergabe an Windows-Spieler |
| Android APK | eine signierte apk | Installation auf Handy und Tablet |

### Stapelmodus

Mehrere sb3 Dateien im Dialog auswählen

Für jedes Projekt erscheint eine Karte

Jede Karte hat eigenes Ziel, eigenen Dateinamen und alle Laufzeiteinstellungen

Seitentitel, Bühnengröße, Skalierung, Turbo, Bildrate, Interpolation, hochwertiger Stift, unendliche Klone, Rand durchqueren, sonstige Limits, Benutzername, Schließen beim Stopp

Ladefortschritt, Ladetext, Ladebild, Fenstersymbol, Autostart und grüne Flagge, Stopp, Pause, Vollbild

Nach oben, nach unten, löschen, einzeln wiederholen, dann alles starten

Downloads werden gestaffelt, damit der Browser sie nicht blockiert

### APK-Optionen

- Symbol aus gängigen Bildformaten
- Paketname, App-Name, Versionsname, Versionscode
- Ausrichtung und minimale Android-Version
- v1 und v2 Signatur lokal erzeugt
- Paketname frei wählbar, mehrere Projekte lassen sich nebeneinander installieren

### Projekt unterstützen

Wenn dir das Tool Zeit spart

- Gib dem Repository einen Star
- Klicke auf Follow in meinem GitHub-Profil
- Schick es einem Freund, der Scratch-Spiele baut

Keine Werbung, keine Spendenfenster, keine Statistik

### Selbst bauen

Node 18 oder neuer empfohlen

```bash
npm ci
npx cross-env NODE_ENV=production STANDALONE=1 VERSION=v2.5 webpack
node src/build/generate-standalone.js
```

Der Launcher liegt in `launcher`, der EXE-Player in `player`

Beides sind reine C# WinForms Projekte, gebaut mit csc und WebView2

### Lizenz und Herkunft

Abgeleitet von TurboWarp Packager 3.14.0

Veröffentlicht unter MPL-2.0, der Lizenz des Originalprojekts

Die LICENSE Datei und alle Copyright-Hinweise bleiben erhalten

Der geänderte Quellcode liegt jeder Version bei, wie MPL-2.0 es verlangt

Es werden keine zusätzlichen Einschränkungen erhoben und die Originallizenz bleibt unberührt

Der Name und das Logo von Scratch gehören MIT Media Lab

Der Name TurboWarp gehört seinen Autoren

Keine offizielle Verbindung zu TurboWarp, Scratch oder MIT und keine Billigung durch sie

## Русский

### Что это

Windows-упаковщик для авторов Scratch

Перетащите один sb3 или сразу несколько

Выберите цель и получите файл для публикации или установки

Вся обработка идёт на вашем компьютере

### Почему удобно

- **Полный офлайн** — без сервера, без отправки, без входа
- **Четыре результата** — HTML, ZIP, один EXE, APK для Android
- **Настоящий пакетный режим** — выбор нескольких файлов, до 20 задач одновременно, настройки для каждого проекта
- **Компактный EXE** — около 0,9МБ сверху, своя иконка, своё имя, своя версия
- **APK без Android Studio** — иконка, имя пакета, имя приложения, версия, ориентация и минимальная версия Android
- **Лёгкая защита** — данные проекта шифруются на диске и расшифровываются в памяти перед запуском, игра работает как раньше
- **Старые системы** — отдельная сборка для Win7 SP1 32 и 64 бит
- **Быстрые профили** — быстрый, обычный, максимальное сжатие
- **Понятный журнал** — время, размер и папка результата для каждой сборки

### Цели

| Цель | Результат | Для чего |
| --- | --- | --- |
| HTML | один самостоятельный html | публикация в сети, быстрая проверка |
| ZIP | html и ресурсы в zip | хостинг, дальнейшая правка |
| Один EXE | один exe | передача игрокам на Windows |
| APK Android | подписанный apk | установка на телефон и планшет |

### Пакетный режим

Выберите несколько sb3 в проводнике

Для каждого проекта появится карточка

У каждой карточки своя цель, своё имя файла и все настройки запуска

Заголовок страницы, размер сцены, режим масштабирования, турбо, частота кадров, интерполяция, качественное перо, бесконечные клоны, проход через край, прочие лимиты, имя пользователя, закрытие при остановке

Экран загрузки, текст, картинка, иконка окна, автозапуск и кнопки зелёный флаг, стоп, пауза, полный экран

Вверх, вниз, удалить, повторить одну задачу, затем запустить все

Скачивания идут с паузой, чтобы браузер их не блокировал

### Параметры APK

- Иконка из обычных форматов изображений
- Имя пакета, имя приложения, имя и код версии
- Ориентация и минимальная версия Android
- Подписи v1 и v2 создаются локально
- Имя пакета можно менять, несколько проектов ставятся рядом

### Поддержать проект

Если инструмент экономит ваше время

- Поставьте Star репозиторию
- Нажмите Follow в моём профиле GitHub
- Передайте другу, который делает игры на Scratch

Без рекламы, без окон для донатов, без статистики

### Сборка из исходников

Рекомендуется Node 18 или новее

```bash
npm ci
npx cross-env NODE_ENV=production STANDALONE=1 VERSION=v2.5 webpack
node src/build/generate-standalone.js
```

Лаунчер лежит в `launcher`, плеер одного EXE в `player`

Оба проекта на чистом C# WinForms, сборка через csc и WebView2

### Лицензия и источник

Основано на TurboWarp Packager 3.14.0

Распространяется по MPL-2.0, как и оригинал

Файл LICENSE и все уведомления об авторских правах сохранены

Изменённый исходный код публикуется с каждым выпуском, как требует MPL-2.0

Дополнительные ограничения не добавляются, лицензия оригинала не затрагивается

Название и логотип Scratch принадлежат MIT Media Lab

Название TurboWarp принадлежит его авторам

Официальной связи с TurboWarp, Scratch или MIT нет и одобрения с их стороны нет
