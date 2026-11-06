using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string path);

    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    static string appDir;
    static string binDir;
    static string dataDir;
    static string outputDir;
    static string htmlPath;
    static string iconPath;

    static void Extract(string resource, string target) {
        using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource))
        using (FileStream destination = new FileStream(target, FileMode.Create, FileAccess.Write)) {
            source.CopyTo(destination);
        }
    }

    static string ResolveOutputDir() {
        string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        if (Directory.Exists(downloads)) {
            return Path.Combine(downloads, "zx作品输出");
        }
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "zx作品输出");
    }

    [STAThread]
    static void Main() {
        SetProcessDPIAware();
        appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "zx-sc-packager");
        bool is64 = IntPtr.Size == 8;
        binDir = Path.Combine(appDir, is64 ? "bin-x64" : "bin-x86");
        dataDir = Path.Combine(appDir, is64 ? "data-x64" : "data-x86");
        outputDir = ResolveOutputDir();
        Directory.CreateDirectory(appDir);
        Directory.CreateDirectory(binDir);
        Directory.CreateDirectory(dataDir);
        Directory.CreateDirectory(outputDir);

        htmlPath = Path.Combine(appDir, is64 ? "app-x64.html" : "app-x86.html");
        iconPath = Path.Combine(binDir, "app.ico");
        Extract("APP_HTML", htmlPath);
        Extract("ICON", iconPath);
        Extract("CORE", Path.Combine(binDir, "Microsoft.Web.WebView2.Core.dll"));
        Extract("WINFORMS", Path.Combine(binDir, "Microsoft.Web.WebView2.WinForms.dll"));
        Extract("LOADER", Path.Combine(binDir, "WebView2Loader.dll"));

        SetDllDirectory(binDir);
        AppDomain.CurrentDomain.AssemblyResolve += (sender, args) => {
            try {
                AssemblyName name = new AssemblyName(args.Name);
                string candidate = Path.Combine(binDir, name.Name + ".dll");
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
        RunApplication();
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static void RunApplication() {
        Application.Run(new MainForm());
    }

    public static string OutputDir {
        get { return outputDir; }
    }

    public static string DataDir {
        get { return dataDir; }
    }

    public static string HtmlPath {
        get { return htmlPath; }
    }

    public static string IconPath {
        get { return iconPath; }
    }
}

public class MainForm : Form {
    private WebView2 web;

    public MainForm() {
        Text = "zx的sc作品打包器";
        Width = 1120;
        Height = 820;
        MinimumSize = new Size(820, 600);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        if (File.Exists(Program.IconPath)) {
            Icon = new Icon(Program.IconPath);
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

            web.CoreWebView2.DownloadStarting += OnDownloadStarting;
            web.CoreWebView2.WebMessageReceived += OnWebMessage;
            web.CoreWebView2.Navigate(new Uri(Program.HtmlPath).AbsoluteUri);
        } catch (Exception error) {
            MessageBox.Show("无法启动内置内核 请确认系统已安装 Microsoft Edge WebView2 Runtime\r\n" + error.Message, "zx的sc作品打包器", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private void OnDownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e) {
        string suggested = e.ResultFilePath;
        string name = string.IsNullOrEmpty(suggested) ? "output" : Path.GetFileName(suggested);
        string target = Path.Combine(Program.OutputDir, name);
        int index = 1;
        while (File.Exists(target)) {
            string extension = Path.GetExtension(name);
            string stem = Path.GetFileNameWithoutExtension(name);
            target = Path.Combine(Program.OutputDir, stem + " (" + index + ")" + extension);
            index++;
        }
        e.ResultFilePath = target;
        e.Handled = false;
    }

    private void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e) {
        string message = e.WebMessageAsJson;
        if (message != null && message.IndexOf("openOutput", StringComparison.OrdinalIgnoreCase) >= 0) {
            try {
                Process.Start("explorer.exe", "\"" + Program.OutputDir + "\"");
            } catch (Exception) {
            }
        }
    }
}
