using System.ComponentModel.DataAnnotations;

namespace MachineMonitoring.Models
{
    public class Machine
    {
        public string MachineCode { get; set; }
        public string MachineName { get; set; }
        public string MachineDetails { get; set; }
        public string User { get; set; }
    }
}
