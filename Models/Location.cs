using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class Location
    {

        public int LocationId { get; set; }

        public string LocationName { get; set; }

        public int PlantNo { get; set; }

        public string? User { get; set; }

    }
}
