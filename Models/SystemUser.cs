using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MachineMonitoring.Models
{
    public class SystemUser
    {
        
        public int EmployeeNo { get; set; }

        
        public string EmployeeName { get; set; }

        
        public string? Password { get; set; }

        
        public bool IsActive { get; set; }

        
        public int AuthorityLevel { get; set; }

        [ValidateNever]
        public string? AuthorityName { get; set; }

        public int PlantNo { get; set; }

        [ValidateNever]
        public string? PlantName { get; set; }

        public string? CreatedBy { get; set; }

        public string? Operation { get; set; }
    }
}
