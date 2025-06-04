using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class MachineLocation
    {
        
        public int MachineLocationId { get; set; }


        public int PlantNo { get; set; }



        public int LocationId { get; set; }


        public string MachineCode { get; set; }


        
        public string MachineCoordinates { get; set; }

        public string User {  get; set; }




    }
}
