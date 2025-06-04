using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class SystemUser
    {
        
        public int EmployeeNo { get; set; }

        
        public string EmployeeName { get; set; }

        
        public string Password { get; set; }

        
        public string AccountStatus { get; set; }

        
        public int AuthorityLevel { get; set; }

        
        public int PlantNo { get; set; }


        public string User { get; set; }
    }
}
