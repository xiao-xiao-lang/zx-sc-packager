using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string path);

    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    static string root;
    static string binDir;
    static string dataDir;
    static string outputDir;

    static void Extract(string resource, string target) {
        using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource))
        using (FileStream destination = new FileStream(target, FileMode.Create, FileAccess.Write)) {
            source.CopyTo(destination);
        }
    }

    static byte[] ReadAll(out int htmlOffset, out int htmlLength, out int iconOffset, out int iconLength, out string meta) {
        htmlOffset = 0;
        htmlLength = 0;
        iconOffset = 0;
        iconLength = 0;
        meta = string.Empty;
        byte[] bytes = File.ReadAllBytes(Application.ExecutablePath);
        if (bytes.Length < 16) {
            return null;
        }
        int foot = bytes.Length - 16;
        uint magic = BitConverter.ToUInt32(bytes, foot + 12);
        if (magic != 0x5A58504B) {
            return null;
        }
        htmlLength = BitConverter.ToInt32(bytes, foot);
        iconLength = BitConverter.ToInt32(bytes, foot + 4);
        int metaLength = BitConverter.ToInt32(bytes, foot + 8);
        if (htmlLength <= 0 || iconLength < 0 || metaLength < 0 || htmlLength + iconLength + metaLength > foot) {
            return null;
        }
        int metaOffset = foot - metaLength;
        iconOffset = metaOffset - iconLength;
        htmlOffset = iconOffset - htmlLength;
        if (htmlOffset < 0) {
            return null;
        }
        if (metaLength > 0) {
            meta = Encoding.UTF8.GetString(bytes, metaOffset, metaLength);
        }
        return bytes;
    }

    [STAThread]
    static void Main() {
        SetProcessDPIAware();
        root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "zx-sc-packager");
        binDir = Path.Combine(root, "player-bin-x86");
        dataDir = Path.Combine(root, "run-data");
        outputDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "zx作品输出");
        Directory.CreateDirectory(root);
        Directory.CreateDirectory(binDir);
        Directory.CreateDirectory(dataDir);
        Directory.CreateDirectory(outputDir);

        Extract("CORE", Path.Combine(binDir, "Microsoft.Web.WebView2.Core.dll"));
        Extract("WINFORMS", Path.Combine(binDir, "Microsoft.Web.WebView2.WinForms.dll"));
        Extract("LOADER", Path.Combine(binDir, "WebView2Loader.dll"));

        int htmlOffset = 0;
        int htmlLength = 0;
        int iconOffset = 0;
        int iconLength = 0;
        string meta = string.Empty;
        byte[] bytes = ReadAll(out htmlOffset, out htmlLength, out iconOffset, out iconLength, out meta);
        if (bytes == null) {
            MessageBox.Show("无法读取作品数据", "zx的sc作品", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        string name = "zx的sc作品";
        string version = string.Empty;
        string[] lines = meta.Split(new char[] { '\n' });
        if (lines.Length > 0 && lines[0].Trim().Length > 0) {
            name = lines[0].Trim();
        }
        if (lines.Length > 1 && lines[1].Trim().Length > 0) {
            version = lines[1].Trim();
        }
        string title = version.Length > 0 ? name + " " + version : name;

        string iconPath = Path.Combine(binDir, "game.ico");
        if (iconLength > 0) {
            byte[] iconBytes = new byte[iconLength];
            Array.Copy(bytes, iconOffset, iconBytes, 0, iconLength);
            File.WriteAllBytes(iconPath, iconBytes);
        } else {
            Extract("ICON", iconPath);
        }

        string htmlPath = Path.Combine(dataDir, "game-" + htmlLength + ".html");
        byte[] htmlBytes = new byte[htmlLength];
        Array.Copy(bytes, htmlOffset, htmlBytes, 0, htmlLength);
        File.WriteAllBytes(htmlPath, htmlBytes);

        SetDllDirectory(binDir);
        AppDomain.CurrentDomain.AssemblyResolve += (sender, args) => {
            try {
                AssemblyName assemblyName = new AssemblyName(args.Name);
                string candidate = Path.Combine(binDir, assemblyName.Name + ".dll");
                if (File.Exists(candidate)) {
                    return Assembly.LoadFrom(candidate);
                }
            } catch (Exception) {
            }
            return null;
        };
        Assembly.LoadFrom(Path.Combine(binDir, "Microsoft.Web.WebView2.Core.dll"));
        Assembly.LoadFrom(Path.Combine(binDir, "Microsoft.Web.WebView2.WinForms.dll"));

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        RunGame(htmlPath, title, iconPath);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static void RunGame(string htmlPath, string title, string iconPath) {
        Application.Run(new GameForm(htmlPath, title, iconPath));
    }

    public static string DataDir { get { return dataDir; } }
    public static string OutputDir { get { return outputDir; } }
}

public class GameForm : Form {
    private WebView2 web;
    private string htmlPath;

    public GameForm(string htmlPath, string title, string iconPath) {
        this.htmlPath = htmlPath;
        Text = title;
        Width = 960;
        Height = 720;
        StartPosition = FormStartPosition.CenterScreen;
        if (File.Exists(iconPath)) {
            Icon = new Icon(iconPath);
        }
        try {
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            Width = Math.Min(1280, area.Width);
            Height = Math.Min(800, area.Height);
        } catch (Exception) {
        }

        web = new WebView2();
        web.Dock = DockStyle.Fill;
        Controls.Add(web);
        Load += OnLoad;
    }

    private async void OnLoad(object sender, EventArgs e) {
        try {
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, Program.DataDir);
            await web.EnsureCoreWebView2Async(environment);
            CoreWebView2Settings settings = web.CoreWebView2.Settings;
            settings.AreDevToolsEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.IsZoomControlEnabled = false;
            web.CoreWebView2.Navigate(new Uri(htmlPath).AbsoluteUri);
        } catch (Exception error) {
            MessageBox.Show("无法启动作品 请确认系统已安装 Microsoft Edge WebView2 Runtime\r\n" + error.Message, "zx的sc作品", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }
}
