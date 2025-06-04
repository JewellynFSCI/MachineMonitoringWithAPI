using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class ProductionMap
    {
        public int? ProductionMapId { get; set; }
        
        [Required]
        public string ProductionMapName { get; set; }
        
        public string? ImgName { get; set; }

        [Required]
        public int PlantNo { get; set; }
        
        public string? PlantName { get; set; }


        public string? CreatedBy { get; set; }

    }
}
