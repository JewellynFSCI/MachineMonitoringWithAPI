using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using MachineMonitoring.Models;

namespace MachineMonitoring.DataAccess
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Machine> Machines { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<Plant> Plants { get; set; }
        public DbSet<MachineLocation> MachineLocations { get; set; }
        public DbSet<SystemUser> SystemUsers { get; set; }
        public DbSet<Authority> Authority { get; set; }
        public DbSet<ProductionMap> ProductionMaps { get; set; }

    }
}
