using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class MachineLocation
    {
        
        public int? MachineLocationId { get; set; }

        public string MachineCode { get; set; }

        public int PlantNo { get; set; }

        public int ProductionMapId { get; set; }

        public int X {  get; set; }

        public int Y { get; set; }

        public string? User {  get; set; }
        public string? CreatedBy { get; set; }

        public int Status { get; set; }

        public string? Process {  get; set; }

        public string? Area { get; set; } 

        public int Process_Category {  get; set; }

    }

    public class Process_Category
    {
        public int id { get; set; }
        public string? ProcessCategory { get; set; }
    }

    public class MachineLocationDTO
    {
        public string MachineCode { get; set; }
        public int PlantNo { get; set; }
        public int Process_Category { get; set; }
        public string? Process { get; set; }
        public string? Area { get; set; }
    }
}
