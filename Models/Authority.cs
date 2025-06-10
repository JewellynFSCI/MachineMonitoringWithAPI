using System.ComponentModel.DataAnnotations;

namespace MachineMonitoring.Models
{
    public class Authority
    {

        public int AuthorityLevel { get; set; }

       
        public string? AuthorityName { get; set; }

       
        public string? AuthorityDescription { get; set; }
        public string? User { get; set; }


    }
}
