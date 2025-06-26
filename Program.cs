using MachineMonitoring.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using MachineMonitoring.DataAccess.Repository;
using MachineMonitoring.Models.ViewModel;
using MachineMonitoring.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<AdminRepo>();
builder.Services.AddScoped<AdminVM>();
builder.Services.AddSession();

builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseSession();
app.UseAuthorization();


app.MapHub<NotificationHub>("/Notification");


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Admin}/{action=ProductionMap}/{id?}");

app.Run();
