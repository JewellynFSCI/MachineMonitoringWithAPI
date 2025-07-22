using System.Net.NetworkInformation;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.Mvc;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using MachineMonitoring.DataAccess.Repository;
using System.Data;
using MySql.Data.MySqlClient;
using Dapper;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System.Text;

namespace MachineMonitoring.Controllers
{
    public class AutoTicketController : Controller
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AutoTicketController> _logger;
        private readonly string _createTicket = "";

        public AutoTicketController(IConfiguration configuration, ILogger<AutoTicketController> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _createTicket = _configuration.GetConnectionString("CreateOwsTicket") ?? "";
        }

        private IDbConnection Connection => new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));

        //automatic create ticket in ows
        public async Task<IActionResult> AutoTicket()
        {
            try
            {
                // Get the first active Wi-Fi adapter
                var wifiAdapter = NetworkInterface.GetAllNetworkInterfaces()
                    .FirstOrDefault(nic =>
                        nic.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 &&
                        nic.OperationalStatus == OperationalStatus.Up);

                if (wifiAdapter == null)
                {
                    ViewBag.Message = "No active Wi-Fi adapter found.";
                }
                else
                {
                    var macAddress = wifiAdapter.GetPhysicalAddress();
                    string formattedMac = string.Join("-", macAddress.GetAddressBytes().Select(b => b.ToString("X2")));

                    // Get assigned machine for this MAC
                    var machineAssigned = await GetMachineAssigned(formattedMac);

                    if (machineAssigned == null || !machineAssigned.Any())
                    {
                        ViewBag.Message = "No machine is assigned to this device!";
                    }
                    else
                    {
                        var first = machineAssigned.First();

                        var CreateTicketToOws = await CreateOWSTicket(first);
                        ViewBag.Message = CreateTicketToOws.ToString();
                    }
                }

                return View();
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }           
        }


        public async Task<List<AutoTicketModel>> GetMachineAssigned(string formattedMac)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "SELECT device_macaddress, machine_code, plantno FROM tablet_per_machine WHERE device_macaddress = @Mac";

                    var result = await connection.QueryAsync<AutoTicketModel>(query, new { Mac = formattedMac });

                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving data");
                throw;
            }
        }


        public async Task<IActionResult> CreateOWSTicket(AutoTicketModel first)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    DateTime currentDateTime = DateTime.Now;
                    var dateOnly = currentDateTime.Date;
                    var timeOnly = currentDateTime.TimeOfDay;

                    // Create the request object
                    var request = new WorkflowRequest
                    {
                        workflowId = 235,
                        requestorId = "009624",
                        formData = new List<FormField>
                        {
                            new FormField { name = "plantNo", value = first.plantno },
                            new FormField { name = "machineStatus", value = "Machine Downtime" },
                            new FormField { name = "process", value = first.process },
                            new FormField { name = "area", value = first.area },
                            new FormField { name = "machineNumber", value = first.machine_code },
                            new FormField { name = "mcErrorTimeStart", value = timeOnly.ToString(@"hh\:mm\:ss")},
                            new FormField { name = "mcErrorDateStart", value = dateOnly.ToString("yyyy-MM-dd")},
                            new FormField { name = "detailsOfError", value = "Machine Downtime through tablet."}

                        }
                    };

                    var json = JsonConvert.SerializeObject(request);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(_createTicket, content);
                    if (response.IsSuccessStatusCode)
                    {
                        return Ok("Request sent successfully!");
                    }
                    else
                    {
                        return StatusCode((int)response.StatusCode, "Failed to send request.");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving data");
                throw;
            }
        }

    }
}
