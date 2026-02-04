using MachineMonitoring.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using MachineMonitoring.DataAccess.Repository;
using MachineMonitoring.Models.ViewModel;
using MachineMonitoring.Hubs;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<AdminRepo>();
builder.Services.AddScoped<AdminVM>();
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        });
});


builder.Services.AddSession();

builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseCors("AllowAll");
app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseSession();
app.UseAuthorization();

var prodMapConfig = builder.Configuration.GetSection("ProductionMaps");
var physicalPath = prodMapConfig["PhysicalPath"];
var requestPath = prodMapConfig["RequestPath"];
if (Directory.Exists(physicalPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(physicalPath),
        RequestPath = requestPath
    });
}

app.MapHub<NotificationHub>("/Notification");


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Admin}/{action=FrontPagev2}/{id?}");

app.Run();
