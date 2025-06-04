using System.ComponentModel.DataAnnotations;

namespace MachineMonitoring.Models
{
    public class Plant
    {

        public int PlantNo { get; set; }
        public string PlantName { get; set; }

        public string User { get; set; }
    }
}
