using System.ComponentModel.DataAnnotations;

namespace MachineMonitoring.Models
{
    public class Machine
    {
        public string? machineCode { get; set; }
        public string? description { get; set; }
        public int plantNo { get; set; }

    }
}
